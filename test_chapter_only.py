#!/usr/bin/env python3

import sys
import os
sys.path.append('/app')

from backend_test import CodeClassAPITester

def main():
    """Run only chapter organization tests"""
    print("🚀 Starting Chapter Organization Tests...")
    
    tester = CodeClassAPITester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user. Exiting.")
        return False
    
    # Test authentication first
    tester.test_auth_endpoints()
    
    # Run chapter organization tests
    tester.test_chapter_organization_endpoints()
    
    # Print summary
    print(f"\n📊 Chapter Organization Test Summary:")
    print(f"   Total tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    return tester.tests_passed == tester.tests_run

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)