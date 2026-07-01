Feature: Security validation for remediated vulnerabilities

  Background:
    Given the application base URL is "http://localhost:8080"

  Scenario: VULN-001 deserialization endpoint rejects unsafe payloads
    Given a vulnerability record with id "VULN-001", cwe "CWE-502", controller "InsecureDeserializationController", endpoint "/api/deserialize", method "POST"
    When I send a JSON payload to "/api/deserialize" with body "{\"test\":\"value\"}"
    Then the response status should be 403
    And the response should be a structured error

  Scenario: VULN-001 deserialization endpoint rejects non-JSON input safely
    Given a vulnerability record with id "VULN-001", cwe "CWE-502", controller "InsecureDeserializationController", endpoint "/api/deserialize", method "POST"
    When I send a plain text payload to "/api/deserialize" with body "not-json"
    Then the response status should be 403
    And the response should be a structured error

  Scenario: VULN-002 login endpoint blocks SQL injection style credentials
    Given a vulnerability record with id "VULN-002", cwe "CWE-89", controller "AuthController", endpoint "/api/login", method "POST"
    When I send a login request to "/api/login" with username "' OR '1'='1" and password "anything"
    Then the response status should be 401
    And the response should indicate invalid credentials

  Scenario: VULN-002 login endpoint accepts only valid credentials for legitimate users
    Given a vulnerability record with id "VULN-002", cwe "CWE-89", controller "AuthController", endpoint "/api/login", method "POST"
    When I send a login request to "/api/login" with username "alice" and password "alice123"
    Then the response status should be 200
    And the response should not expose a password field

  Scenario: VULN-003 search endpoint blocks injection payloads
    Given a vulnerability record with id "VULN-003", cwe "CWE-89", controller "UserController", endpoint "/api/search", method "GET"
    When I request "/api/search?q=' OR '1'='1"
    Then the response status should be 200
    And the response should not contain a full user dump

  Scenario: VULN-003 search endpoint requires authentication boundary
    Given a vulnerability record with id "VULN-003", cwe "CWE-89", controller "UserController", endpoint "/api/search", method "GET"
    When I request "/api/search?q=alice" without authentication
    Then the response status should be 401 or 403
    And the response should indicate authentication is required
