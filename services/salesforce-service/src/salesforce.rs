use crate::models::*;
use anyhow::{anyhow, Result};
use reqwest::{Client, header::HeaderMap};
use serde_json::Value;
use std::collections::HashMap;
use rand::Rng;

#[derive(Clone)]
pub struct SalesforceClient {
    client: Client,
    client_id: String,
    client_secret: String,
    instance_url: String,
}

impl SalesforceClient {
    pub fn new(client_id: String, client_secret: String, instance_url: String) -> Self {
        Self {
            client: Client::new(),
            client_id,
            client_secret,
            instance_url,
        }
    }

    pub fn get_authorize_url(&self, redirect_uri: &str, state: &str) -> String {
        format!(
            "{}/services/oauth2/authorize?response_type=code&client_id={}&redirect_uri={}&state={}",
            self.instance_url, self.client_id, 
            urlencoding::encode(redirect_uri),
            urlencoding::encode(state)
        )
    }

    pub async fn exchange_code_for_token(&self, code: &str, redirect_uri: &str) -> Result<SalesforceToken> {
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code");
        params.insert("code", code);
        params.insert("client_id", &self.client_id);
        params.insert("client_secret", &self.client_secret);
        params.insert("redirect_uri", redirect_uri);

        println!("🔍 Token exchange request:");
        println!("  URL: {}/services/oauth2/token", self.instance_url);
        println!("  client_id: {}", self.client_id);
        println!("  redirect_uri: {}", redirect_uri);
        println!("  code: {}...", &code[..std::cmp::min(20, code.len())]);

        let response = self.client
            .post(&format!("{}/services/oauth2/token", self.instance_url))
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            println!("❌ Token exchange failed: {}", error_text);
            return Err(anyhow!("Token exchange failed: {}", error_text));
        }

        let token_response: Value = response.json().await?;
        
        Ok(SalesforceToken {
            access_token: token_response["access_token"].as_str().unwrap().to_string(),
            refresh_token: token_response["refresh_token"].as_str().map(|s| s.to_string()),
            instance_url: token_response["instance_url"].as_str().unwrap().to_string(),
            token_type: token_response["token_type"].as_str().unwrap_or("Bearer").to_string(),
            expires_in: token_response["expires_in"].as_i64(),
            created_at: chrono::Utc::now(),
        })
    }

    pub async fn refresh_token(&self, refresh_token: &str) -> Result<SalesforceToken> {
        let mut params = HashMap::new();
        params.insert("grant_type", "refresh_token");
        params.insert("refresh_token", refresh_token);
        params.insert("client_id", &self.client_id);
        params.insert("client_secret", &self.client_secret);

        let response = self.client
            .post(&format!("{}/services/oauth2/token", self.instance_url))
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Token refresh failed: {}", error_text));
        }

        let token_response: Value = response.json().await?;
        
        Ok(SalesforceToken {
            access_token: token_response["access_token"].as_str().unwrap().to_string(),
            refresh_token: Some(refresh_token.to_string()), // Keep existing refresh token
            instance_url: token_response["instance_url"].as_str().unwrap().to_string(),
            token_type: token_response["token_type"].as_str().unwrap_or("Bearer").to_string(),
            expires_in: token_response["expires_in"].as_i64(),
            created_at: chrono::Utc::now(),
        })
    }

    pub async fn query_opportunities(&self, token: &SalesforceToken, limit: Option<i32>) -> Result<Vec<SalesforceOpportunity>> {
        let limit_clause = limit.map_or_else(|| "".to_string(), |l| format!(" LIMIT {}", l));
        
        let query = format!(
            "SELECT Id, Name, Amount, StageName, CloseDate, CreatedDate, LastModifiedDate, 
             Account.Id, Account.Name, 
             Owner.Id, Owner.Name, Owner.Email 
             FROM Opportunity 
             WHERE IsDeleted = false{}",
            limit_clause
        );

        self.execute_query(&token, &query).await
    }

    pub async fn query_leads(&self, token: &SalesforceToken, limit: Option<i32>) -> Result<Vec<SalesforceLead>> {
        let limit_clause = limit.map_or_else(|| "".to_string(), |l| format!(" LIMIT {}", l));
        
        let query = format!(
            "SELECT Id, Name, Company, Email, Phone, Status, CreatedDate,
             Owner.Id, Owner.Name, Owner.Email 
             FROM Lead 
             WHERE IsDeleted = false{}",
            limit_clause
        );

        self.execute_query(&token, &query).await
    }

    async fn execute_query<T>(&self, token: &SalesforceToken, query: &str) -> Result<Vec<T>>
    where
        T: serde::de::DeserializeOwned,
    {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", token.access_token).parse()?,
        );

        let url = format!("{}/services/data/v59.0/query", token.instance_url);
        let mut query_params = HashMap::new();
        query_params.insert("q", query);

        let response = self.client
            .get(&url)
            .headers(headers)
            .query(&query_params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Salesforce query failed: {}", error_text));
        }

        let query_response: SalesforceQueryResponse<T> = response.json().await?;
        Ok(query_response.records)
    }

    pub async fn get_user_info(&self, token: &SalesforceToken) -> Result<SalesforceUser> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", token.access_token).parse()?,
        );

        // Use the identity URL from the token response or construct it
        let identity_url = format!("{}/services/oauth2/userinfo", token.instance_url);
        
        let response = self.client
            .get(&identity_url)
            .headers(headers)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Failed to get user info: {}", error_text));
        }

        let user_info: Value = response.json().await?;
        
        Ok(SalesforceUser {
            id: user_info["user_id"].as_str().unwrap_or_default().to_string(),
            name: user_info["name"].as_str().unwrap_or_default().to_string(),
            email: user_info["email"].as_str().map(|s| s.to_string()),
        })
    }
}