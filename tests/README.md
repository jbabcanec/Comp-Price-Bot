# Test Organization Standards

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual functions/classes
├── integration/             # Integration tests for service interactions
├── fixtures/               # Test data and mock files
├── data/                   # Large test datasets
├── manual/                 # Manual test scripts (not automated)
├── test-config.js          # Centralized test configuration
├── setup.ts                # Jest setup file
└── README.md               # This file
```

## Test File Naming

- Unit tests: `<service-name>.test.ts`
- Integration tests: `<feature-name>.test.ts`
- Test data: `<description>-test-data.ts`

## Test Location Rules

1. **Unit tests** should be co-located with source code in `__tests__` folders
   - Example: `src/main/services/__tests__/fileProcessor.test.ts`
   - OR in `tests/unit/` for cross-cutting concerns

2. **Integration tests** always go in `tests/integration/`
   - These test multiple services working together

3. **Test data** goes in:
   - `tests/fixtures/` for small test files
   - `tests/data/` for larger datasets
   - Never in the project root

4. **Manual test scripts** go in `tests/manual/`
   - These are for developer testing, not CI

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/fileProcessor.test.ts

# Run manual API tests
node tests/manual/live-api-test.js
```

## Test Environment

All tests use `tests/test-config.js` for:
- Electron mocking
- File system mocking
- Environment setup
- Utility functions

## Standards

1. **No test files in root directory**
2. **No duplicate test data**
3. **Clear separation between unit/integration tests**
4. **All mocks centralized in test-config.js**
5. **Test data organized by type**