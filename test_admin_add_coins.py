#!/usr/bin/env python3
"""
Focused test script for AdminAddCoins backend functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend_test import CodeClassAPITester

def main():
    """Run AdminAddCoins tests only"""
    print("🎯 AdminAddCoins Backend Testing")
    print("=" * 50)
    
    tester = CodeClassAPITester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user. Exiting.")
        return False
    
    # Run AdminAddCoins tests
    tester.test_admin_add_coins_endpoints()
    
    # Print summary
    print(f"\n📊 AdminAddCoins Test Summary:")
    print(f"   Total tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    
    if tester.tests_run > 0:
        success_rate = (tester.tests_passed / tester.tests_run) * 100
        print(f"   Success rate: {success_rate:.1f}%")
        
        if tester.tests_passed == tester.tests_run:
            print("\n🎉 All AdminAddCoins tests passed!")
            return True
        else:
            print(f"\n⚠️  {tester.tests_run - tester.tests_passed} test(s) failed")
            return False
    else:
        print("\n❌ No tests were run")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)