#!/usr/bin/env python3

import requests
import json

def test_admin_protection():
    """Test that admin accounts are properly protected from role switching"""
    
    base_url = "https://codetutor-11.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Get the admin session token from database
    import subprocess
    result = subprocess.run([
        'mongosh', 'test_database', '--eval', 
        'db.sessions.findOne({user_id: {$regex: "test-admin"}}, {session_token: 1})'
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Failed to get admin session token")
        return False
    
    # Extract session token from output
    lines = result.stdout.strip().split('\n')
    for line in lines:
        if 'session_token:' in line:
            session_token = line.split("'")[1]
            break
    else:
        print("❌ Could not find session token in output")
        return False
    
    print(f"🔑 Using admin session token: {session_token[:20]}...")
    
    # Test admin protection
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {session_token}'
    }
    
    # First verify this is an admin account
    me_response = requests.get(f"{api_url}/auth/me", headers=headers)
    if me_response.status_code == 200:
        user_data = me_response.json()
        print(f"👤 User: {user_data.get('name')} ({user_data.get('role')})")
        print(f"🛡️  Admin status: {user_data.get('is_admin')}")
        
        if not user_data.get('is_admin'):
            print("❌ Test account is not admin - cannot test admin protection")
            return False
    else:
        print(f"❌ Failed to get user info: {me_response.status_code}")
        return False
    
    # Try to switch roles (should be blocked)
    switch_response = requests.post(f"{api_url}/auth/switch-role", headers=headers)
    
    if switch_response.status_code == 403:
        error_data = switch_response.json()
        if "Admin accounts cannot be switched" in error_data.get('detail', ''):
            print("✅ Admin protection working correctly - role switch blocked")
            return True
        else:
            print(f"❌ Wrong error message: {error_data}")
            return False
    else:
        print(f"❌ Admin account was allowed to switch roles! Status: {switch_response.status_code}")
        return False

if __name__ == "__main__":
    success = test_admin_protection()
    print(f"\n🎯 Admin Protection Test: {'PASSED' if success else 'FAILED'}")