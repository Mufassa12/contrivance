# 🧪 Discovery API Authentication - Testing Guide

**Latest Changes**: 
- ✅ Account name now passed to session creation
- ✅ Auth middleware logging improved with tracing
- ✅ Frontend and backend rebuilt and redeployed

---

## 🔍 What to Look For

### Browser Console (F12 → Console)

You should see these logs in order:

```
🔐 [AUTH] Token keys in localStorage:
  - access_token: eyJ0eXAiOiJKV1QiLCJh...
  - authToken: NOT FOUND
  - token: NOT FOUND
  - auth_token: NOT FOUND
  - ruggerai-auth-token: NOT FOUND

✅ [AUTH] Final token selected: eyJ0eXAiOiJKV1QiLCJh...
✅ [AUTH] Authorization header added to request
🔑 [AUTH] Token starts with: eyJ0eXAiOiJKV1QiLCJh...

🔗 [API] GET /discovery/accounts/001gL00000RQBY9QAP
```

### Network Tab (F12 → Network)

- Request to: `GET http://localhost:8003/api/discovery/accounts/001gL00000RQBY9QAP`
- Header: `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh...`
- Response: **Should be 200 OK** (not 401)

---

## ✅ Step-by-Step Test

1. **Open browser** to `http://localhost:3000`
2. **Open DevTools** (F12) → Console tab
3. **Log out** if logged in (click logout)
4. **Log back in** with your credentials
5. **Navigate to Discovery** module
6. **Click Account Selector** dropdown
7. **Select an account** from the list
8. **Watch console logs** - should see token and auth logs

---

## 🐛 Debugging Checklist

### If you see ✅ logs but still get 401:

**Backend Logs** (shows why JWT validation failed):
```bash
docker-compose logs contrivance-service 2>&1 | grep "\[AUTH\]" | tail -20
```

Look for these messages:
- `✅ [AUTH] Validating token:` - Token received
- `✅ [AUTH] Token valid, user_id:` - JWT is valid ✅
- `❌ [AUTH] Token validation failed:` - JWT is invalid ❌
  - Could be: expired, invalid signature, wrong secret, etc.

### If you see ❌ [AUTH] Token validation failed:

The JWT token is not passing validation. This could mean:
1. Token is expired
2. Token was signed with different secret
3. Token format is corrupted

---

## 🔑 Token Information

### Internal App JWT (stored as `access_token`):
- Created by: `api.ts` after login (`/api/auth/login`)
- Used by: Discovery API, Spreadsheet API, all internal services
- Secret: `JWT_SECRET` environment variable
- Duration: 1 hour (check `api.ts` interceptor)

### JWT Structure:
```
Header.Payload.Signature
```

The **Payload** should contain:
- `sub`: User ID (UUID)
- `email`: User email
- `name`: User name
- `role`: User role (e.g., "user")
- `exp`: Expiration timestamp
- `iat`: Issued at timestamp
- `jti`: Session ID

---

## 🚀 Next Steps

Once you test and share the console output:

1. **If 200 OK**: 
   - Data persistence should work ✅
   - Try filling a response and saving
   - Navigate back - data should appear

2. **If still 401**:
   - Check backend logs: `docker-compose logs contrivance-service | grep "\[AUTH\]"`
   - Share the error message
   - May need to check JWT_SECRET consistency between services

3. **If 400**:
   - Missing required field in request
   - Check request body has all required fields

---

## 📋 Quick Commands

```bash
# Check all containers running
docker-compose ps

# Check backend logs for auth
docker-compose logs contrivance-service 2>&1 | grep "\[AUTH\]"

# Check frontend logs
docker-compose logs frontend 2>&1 | tail -50

# Check if Discovery API is up
curl http://localhost:8003/api/public/discovery/health | jq .

# Test Discovery API with token (use real token from browser console)
curl -X GET "http://localhost:8003/api/discovery/accounts/001gL00000RQBY9QAP" \
  -H "Authorization: Bearer <TOKEN_FROM_CONSOLE>" \
  -H "Content-Type: application/json" \
  -v
```

---

## 📝 Test Results Template

When you test, please share:

```
**Browser Console Logs**:
[Paste console output showing token and API logs]

**API Response Status**:
[200 OK / 401 Unauthorized / 400 Bad Request]

**Backend Logs** (docker-compose logs contrivance-service | grep "[AUTH]"):
[Paste auth-related logs]

**Current Issues**:
[Describe what's still not working]
```

---

*Last Updated: 2025-10-19*  
*Commit: 416c036*
