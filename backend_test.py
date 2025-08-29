#!/usr/bin/env python3
"""
TaskMaster Backend API Test Suite
Tests all CRUD operations and API endpoints for the TaskMaster application.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Load environment variables
BACKEND_URL = "https://sprint-build.preview.emergentagent.com/api"

class TaskMasterAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.created_task_ids = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def cleanup_created_tasks(self):
        """Clean up any tasks created during testing"""
        for task_id in self.created_task_ids:
            try:
                self.session.delete(f"{self.base_url}/tasks/{task_id}")
            except:
                pass
                
    def test_api_root(self) -> bool:
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "TaskMaster" in data["message"]:
                    self.log_test("API Root Endpoint", True, f"Response: {data}")
                    return True
                else:
                    self.log_test("API Root Endpoint", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Root Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Exception: {str(e)}")
            return False
            
    def test_create_task(self) -> Dict[str, Any]:
        """Test POST /api/tasks endpoint"""
        test_task = {
            "title": "Complete Project Documentation",
            "description": "Write comprehensive documentation for the TaskMaster project",
            "priority": "high",
            "category": "work"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/tasks",
                json=test_task,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                task_data = response.json()
                
                # Validate response structure
                required_fields = ["id", "title", "description", "priority", "category", "status", "created_at", "updated_at"]
                missing_fields = [field for field in required_fields if field not in task_data]
                
                if missing_fields:
                    self.log_test("Create Task", False, f"Missing fields: {missing_fields}")
                    return {}
                
                # Validate field values
                if (task_data["title"] == test_task["title"] and 
                    task_data["description"] == test_task["description"] and
                    task_data["priority"] == test_task["priority"] and
                    task_data["category"] == test_task["category"] and
                    task_data["status"] == "pending"):
                    
                    self.created_task_ids.append(task_data["id"])
                    self.log_test("Create Task", True, f"Created task with ID: {task_data['id']}")
                    return task_data
                else:
                    self.log_test("Create Task", False, f"Field validation failed: {task_data}")
                    return {}
            else:
                self.log_test("Create Task", False, f"Status: {response.status_code}, Response: {response.text}")
                return {}
                
        except Exception as e:
            self.log_test("Create Task", False, f"Exception: {str(e)}")
            return {}
            
    def test_get_tasks(self) -> bool:
        """Test GET /api/tasks endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/tasks")
            
            if response.status_code == 200:
                tasks = response.json()
                
                if isinstance(tasks, list):
                    self.log_test("Get Tasks List", True, f"Retrieved {len(tasks)} tasks")
                    return True
                else:
                    self.log_test("Get Tasks List", False, f"Expected list, got: {type(tasks)}")
                    return False
            else:
                self.log_test("Get Tasks List", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Tasks List", False, f"Exception: {str(e)}")
            return False
            
    def test_get_task_by_id(self, task_id: str) -> bool:
        """Test GET /api/tasks/{task_id} endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/tasks/{task_id}")
            
            if response.status_code == 200:
                task = response.json()
                
                if task.get("id") == task_id:
                    self.log_test("Get Task by ID", True, f"Retrieved task: {task['title']}")
                    return True
                else:
                    self.log_test("Get Task by ID", False, f"ID mismatch: expected {task_id}, got {task.get('id')}")
                    return False
            elif response.status_code == 404:
                self.log_test("Get Task by ID", False, f"Task not found: {task_id}")
                return False
            else:
                self.log_test("Get Task by ID", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Task by ID", False, f"Exception: {str(e)}")
            return False
            
    def test_update_task(self, task_id: str) -> bool:
        """Test PUT /api/tasks/{task_id} endpoint"""
        update_data = {
            "title": "Updated Project Documentation",
            "description": "Updated comprehensive documentation for the TaskMaster project",
            "priority": "medium",
            "status": "completed"
        }
        
        try:
            response = self.session.put(
                f"{self.base_url}/tasks/{task_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                updated_task = response.json()
                
                # Validate updates
                if (updated_task["title"] == update_data["title"] and
                    updated_task["description"] == update_data["description"] and
                    updated_task["priority"] == update_data["priority"] and
                    updated_task["status"] == update_data["status"]):
                    
                    self.log_test("Update Task", True, f"Successfully updated task: {task_id}")
                    return True
                else:
                    self.log_test("Update Task", False, f"Update validation failed: {updated_task}")
                    return False
            elif response.status_code == 404:
                self.log_test("Update Task", False, f"Task not found: {task_id}")
                return False
            else:
                self.log_test("Update Task", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Task", False, f"Exception: {str(e)}")
            return False
            
    def test_filtering_and_sorting(self) -> bool:
        """Test GET /api/tasks with query parameters"""
        test_cases = [
            {"params": {"category": "work"}, "name": "Filter by Category"},
            {"params": {"priority": "high"}, "name": "Filter by Priority"},
            {"params": {"status": "pending"}, "name": "Filter by Status"},
            {"params": {"sort_by": "title", "order": "asc"}, "name": "Sort by Title ASC"},
            {"params": {"sort_by": "created_at", "order": "desc"}, "name": "Sort by Created Date DESC"},
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                response = self.session.get(f"{self.base_url}/tasks", params=test_case["params"])
                
                if response.status_code == 200:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        self.log_test(test_case["name"], True, f"Retrieved {len(tasks)} filtered/sorted tasks")
                    else:
                        self.log_test(test_case["name"], False, f"Expected list, got: {type(tasks)}")
                        all_passed = False
                else:
                    self.log_test(test_case["name"], False, f"Status: {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(test_case["name"], False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
        
    def test_delete_task(self, task_id: str) -> bool:
        """Test DELETE /api/tasks/{task_id} endpoint"""
        try:
            response = self.session.delete(f"{self.base_url}/tasks/{task_id}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result and "deleted" in result["message"].lower():
                    self.log_test("Delete Task", True, f"Successfully deleted task: {task_id}")
                    # Remove from cleanup list since it's already deleted
                    if task_id in self.created_task_ids:
                        self.created_task_ids.remove(task_id)
                    return True
                else:
                    self.log_test("Delete Task", False, f"Unexpected response: {result}")
                    return False
            elif response.status_code == 404:
                self.log_test("Delete Task", False, f"Task not found: {task_id}")
                return False
            else:
                self.log_test("Delete Task", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete Task", False, f"Exception: {str(e)}")
            return False
            
    def test_error_handling(self) -> bool:
        """Test error handling for invalid requests"""
        test_cases = [
            {
                "name": "Get Non-existent Task",
                "method": "GET",
                "url": f"{self.base_url}/tasks/non-existent-id",
                "expected_status": 404
            },
            {
                "name": "Update Non-existent Task", 
                "method": "PUT",
                "url": f"{self.base_url}/tasks/non-existent-id",
                "data": {"title": "Test"},
                "expected_status": 404
            },
            {
                "name": "Delete Non-existent Task",
                "method": "DELETE", 
                "url": f"{self.base_url}/tasks/non-existent-id",
                "expected_status": 404
            }
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                if test_case["method"] == "GET":
                    response = self.session.get(test_case["url"])
                elif test_case["method"] == "PUT":
                    response = self.session.put(test_case["url"], json=test_case.get("data", {}))
                elif test_case["method"] == "DELETE":
                    response = self.session.delete(test_case["url"])
                    
                if response.status_code == test_case["expected_status"]:
                    self.log_test(test_case["name"], True, f"Correctly returned {response.status_code}")
                else:
                    self.log_test(test_case["name"], False, f"Expected {test_case['expected_status']}, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(test_case["name"], False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
        
    def run_comprehensive_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("TaskMaster Backend API Test Suite")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print()
        
        test_results = {}
        
        # Test 1: API Root
        test_results["api_root"] = self.test_api_root()
        
        # Test 2: Create Task
        created_task = self.test_create_task()
        test_results["create_task"] = bool(created_task)
        
        if created_task:
            task_id = created_task["id"]
            
            # Test 3: Get Tasks List
            test_results["get_tasks"] = self.test_get_tasks()
            
            # Test 4: Get Task by ID
            test_results["get_task_by_id"] = self.test_get_task_by_id(task_id)
            
            # Test 5: Update Task
            test_results["update_task"] = self.test_update_task(task_id)
            
            # Test 6: Filtering and Sorting
            test_results["filtering_sorting"] = self.test_filtering_and_sorting()
            
            # Test 7: Delete Task
            test_results["delete_task"] = self.test_delete_task(task_id)
        else:
            print("⚠️  Skipping dependent tests due to task creation failure")
            test_results.update({
                "get_tasks": False,
                "get_task_by_id": False, 
                "update_task": False,
                "filtering_sorting": False,
                "delete_task": False
            })
            
        # Test 8: Error Handling
        test_results["error_handling"] = self.test_error_handling()
        
        # Cleanup
        self.cleanup_created_tasks()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in test_results.values() if result)
        total_tests = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
            
        print()
        print(f"Overall Result: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Please check the details above.")
            return False

def main():
    """Main test execution"""
    tester = TaskMasterAPITester()
    return tester.run_comprehensive_tests()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)