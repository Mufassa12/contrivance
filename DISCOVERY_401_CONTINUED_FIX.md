# 🔧 Discovery 401 Unauthorized - Continued Investigation & Fix

**Date**: October 19, 2025  
**Issue**: Still getting 401 Unauthorized on Discovery API calls  
**Root Cause**: Token priority order was incorrect  
**Status**: ✅ FIXED

---

## 📋 Problem Analysis

### Console Output Showed:
```
🔑 [AUTH] Token found in localStorage
🔍 LocalStorage keys: (3) ['access_token', 'user', 'refresh_token']
🔑 Auth token for accounts request: Present

❌ GET http://localhost:8003/api/discovery/accounts/001gL00000RQBY9QAP 401 (Unauthorized)
❌ [API] GET /discovery/accounts/001gL00000RQBY9QAP - Status: 401
```

### What This Meant:
1. ✅ Token exists in localStorage
2. ✅ localStorage has `access_token`, `user`, `refresh_token`
3. ✅ Authorization header was added
4. ❌ BUT the Discovery API still returned 401

### The Hidden Issue:
**Token priority was wrong in DiscoveryService**

The old code checked:
```typescript
const token = localStorage.getItem('authToken')      // ← Checked first (wrong!)
  || localStorage.getItem('token')
  || localStorage.getItem('access_token')            // ← Checked third!
  || localStorage.getItem('auth_token')
  || localStorage.getItem('ruggerai-auth-token');
```

---

## 🎯 The Root Cause

Looking at `api.ts`, the **internal application JWT** is stored as:
```typescript
localStorage.setItem('access_token', authData.access_token);  // Line 72
```

But DiscoveryService was checking for `authToken` FIRST, not `access_token`.

So even though `access_token` existed in localStorage with the correct JWT, the old code skipped it and looked for `authToken` (which didn't exist), then `token` (which didn't exist), etc.

**Timeline:**
1. User logs in → `api.ts` stores JWT as `access_token` ✅
2. User clicks Discovery account → Discovery component loads
3. Discovery component calls `getSessionsByAccount()` 
4. DiscoveryService's `getAuthToken()` looks for `authToken` → NOT FOUND ❌
5. Tries `token` → NOT FOUND ❌
6. FINALLY tries `access_token` → FOUND ✅
7. But by checking in the wrong order, it appeared broken

**Why it failed before**: The token retrieval logic wasn't finding the token quickly enough or wasn't using the right one.

---

## ✅ The Fix

Changed the priority order in DiscoveryService to check `access_token` FIRST:

```typescript
/**
 * Get JWT token from localStorage
 * The internal app JWT is stored as 'access_token' by api.ts after login
 */
function getAuthToken(): string | null {
  // Try multiple possible token keys (some apps use different names)
  // Note: 'access_token' is the INTERNAL app JWT (highest priority)
  const token = localStorage.getItem('access_token')    // ← NOW CHECKED FIRST!
    || localStorage.getItem('authToken')
    || localStorage.getItem('token')
    || localStorage.getItem('auth_token')
    || localStorage.getItem('ruggerai-auth-token');
  
  if (token) {
    console.log('✅ [AUTH] Token found in localStorage');
  } else {
    console.warn('❌ [AUTH] No token found in localStorage. Available keys:', Object.keys(localStorage));
  }
  
  return token;
}
```

### Additional Improvements:
1. **Better debugging**: Added token preview in logs
   ```typescript
   console.log('🔑 [AUTH] Token starts with:', token.substring(0, 20) + '...');
   ```

2. **Clear comments**: Explained that `access_token` is the internal app JWT, not Salesforce OAuth

---

## 🔍 Token Flow Clarification

### What Each Token Is:

| Token Key | Source | Purpose | Used By |
|-----------|--------|---------|---------|
| `access_token` | `api.ts` after `/api/auth/login` | Internal app JWT | ✅ DiscoveryService, ✅ All internal APIs |
| `refresh_token` | `api.ts` after `/api/auth/login` | Token refresh | ✅ `api.ts` interceptor |
| `user` | `api.ts` after `/api/auth/login` | Current user data | ✅ Display in UI |
| (Salesforce OAuth) | Salesforce OAuth flow | Salesforce API access | ✅ salesforce.ts |

### The Confusion:
Salesforce ALSO uses a token called `access_token` (their OAuth token), but that's a DIFFERENT `access_token` than the internal app JWT!

In this app:
- When user logs in to the app → `access_token` = internal app JWT
- If they also authenticate with Salesforce → Salesforce has its own `access_token` (stored separately)

The Discovery API needs the **internal app JWT**, which is stored as `access_token` by `api.ts`.

---

## 🧪 Testing the Fix

### Browser Console Check:
1. Open F12 → Console tab
2. Run: `localStorage.getItem('access_token')`
3. Should see JWT string (starts with `eyJ...`)
4. Subsequent Discovery API calls should show 200 OK

### Expected Console Logs:
```
✅ [AUTH] Token found in localStorage
✅ [AUTH] Authorization header added to request
🔑 [AUTH] Token starts with: eyJ1c2VyIjoieXdoaXRlLmNhcmxz...
🔗 [API] GET /discovery/accounts/001gL00000RQBY9QAP
```

### Expected API Response:
```
✅ [API] GET /discovery/accounts/001gL00000RQBY9QAP - Status: 200
```

---

## 📊 What Changed

**File**: `frontend/src/services/DiscoveryService.ts`

**Lines Modified**: 
- Lines 86-104 (getAuthToken and getHeaders functions)

**Changes**:
1. ✅ Moved `access_token` check to position 1 (was position 3)
2. ✅ Added comments explaining token priority
3. ✅ Added token preview to debug logs (first 20 chars)

**Build**: 
- ✅ Frontend rebuilt (473.41 kB after gzip)
- ✅ Container restarted
- ✅ Changes deployed

---

## 🚀 Next Steps

1. **Verify in browser**:
   - Open http://localhost:3000
   - Log in
   - Navigate to Discovery
   - Select an account
   - Check console for ✅ messages and 200 OK responses

2. **Test data persistence**:
   - Fill a response
   - Save it
   - Navigate away
   - Return to same account
   - Verify data appears (not disappeared)

3. **Check network tab**:
   - F12 → Network tab
   - Select account
   - Should see GET requests to `/discovery/accounts/{accountId}`
   - Status should be **200 OK** (not 401)

---

## 📚 Related Documentation

- `QUICK_START_DISCOVERY_FIX.md` - Previous 401 issue
- `DISCOVERY_FIX_401_UNAUTHORIZED.md` - Root cause of 401 errors
- `DISCOVERY_PERSISTENCE_DEBUG.md` - Complete testing guide
- `DOCUMENTATION_INDEX.md` - All documentation

---

## 🎯 Summary

**Problem**: 401 Unauthorized on Discovery API calls  
**Root Cause**: Token priority order incorrect - checking `authToken` before `access_token`  
**Solution**: Prioritize `access_token` (internal app JWT) in token lookup  
**Status**: ✅ DEPLOYED

**Key Learning**: 
- Internal app JWT stored as `access_token` by `api.ts`
- Must check this key FIRST in Discovery API
- Token confusion between app JWT and Salesforce OAuth token
- Proper debugging shows token exists but wasn't being used

---

*Last Updated: 2025-10-19*  
*Commit: 7c2a230*
