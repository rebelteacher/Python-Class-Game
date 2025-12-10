#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend_test import CodeClassAPITester

def main():
    """Run only the coding test best score bug fix test"""
    tester = CodeClassAPITester()
    
    # Setup test user
    if not tester.setup_test_user():
        print("❌ Failed to setup test user - aborting tests")
        return
    
    # Run the specific test
    tester.test_coding_test_best_score_bug_fix()
    
    # Print summary
    print(f"\n📊 Test Summary:")
    print(f"   Total tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed - check logs above")
        failed_tests = [t for t in tester.test_results if not t["success"]]
        for test in failed_tests:
            print(f"   ❌ {test['test']}: {test['details']}")

if __name__ == "__main__":
    main()