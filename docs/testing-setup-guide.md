# Testing Setup Guide

วิธีการติดตั้งและรัน tests สำหรับ Delivery Genie Dashboard

---

## 📦 Installation

### 1. ติดตั้ง Testing Dependencies

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @swc/jest
```

### 2. อัปเดต package.json

เพิ่ม scripts ใน `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 🚀 Running Tests

### รัน tests ทั้งหมด
```bash
npm test
```

### รัน tests แบบ watch mode (auto-rerun เมื่อไฟล์เปลี่ยน)
```bash
npm run test:watch
```

### รัน tests พร้อม coverage report
```bash
npm run test:coverage
```

### รัน tests สำหรับ CI/CD
```bash
npm run test:ci
```

---

## 📁 Test File Structure

```
delivery-genie-dashboard/
├── __tests__/
│   ├── setup.ts                      # Test setup configuration
│   ├── components/
│   │   ├── Button.test.tsx
│   │   ├── Card.test.tsx
│   │   ├── Header.test.tsx
│   │   └── LoadingSpinner.test.tsx
│   ├── contexts/
│   │   └── CartContext.test.tsx
│   ├── pages/
│   │   ├── shop.test.tsx
│   │   ├── cart.test.tsx
│   │   └── checkout.test.tsx
│   └── api/
│       ├── stores/nearest.test.ts
│       └── orders/create.test.ts
├── jest.config.js
└── src/
    └── ...
```

---

## ✍️ Writing Tests

### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components';

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Context/Hook Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/CartContext';

describe('useCart', () => {
  it('should add item to cart', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(mockProduct, 1);
    });

    expect(result.current.cart.items).toHaveLength(1);
  });
});
```

### API Route Test Example

```typescript
import { POST } from '@/app/api/stores/nearest/route';
import { NextRequest } from 'next/server';

describe('POST /api/stores/nearest', () => {
  it('should return nearest store', async () => {
    const request = new NextRequest('http://localhost/api/stores/nearest', {
      method: 'POST',
      body: JSON.stringify({
        latitude: 13.7,
        longitude: 100.5,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.store).toBeDefined();
  });
});
```

---

## 🎯 Testing Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should do something', () => {
  // Arrange - Setup test data
  const user = { name: 'Test User' };

  // Act - Perform action
  render(<Profile user={user} />);

  // Assert - Verify result
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

### 2. Use Testing Library Queries

**ลำดับความสำคัญของ queries:**

1. `getByRole` - ดีที่สุดสำหรับ accessibility
2. `getByLabelText` - สำหรับ form elements
3. `getByPlaceholderText` - สำหรับ inputs
4. `getByText` - สำหรับ non-interactive elements
5. `getByTestId` - ใช้เป็นทางเลือกสุดท้าย

```typescript
// ✅ Good
screen.getByRole('button', { name: /submit/i });

// ⚠️ Avoid
screen.getByTestId('submit-button');
```

### 3. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation
it('should call setState', () => {
  const setState = jest.fn();
  // ...
});

// ✅ Good - Testing behavior
it('should display error message when form is invalid', () => {
  render(<Form />);
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/error/i)).toBeInTheDocument();
});
```

### 4. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('@/lib/api', () => ({
  fetchProducts: jest.fn(() => Promise.resolve(mockProducts)),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
```

### 5. Use Describe Blocks for Organization

```typescript
describe('ShoppingCart', () => {
  describe('Adding Items', () => {
    it('should add item to cart', () => { /* ... */ });
    it('should increase quantity for existing item', () => { /* ... */ });
  });

  describe('Removing Items', () => {
    it('should remove item from cart', () => { /* ... */ });
  });
});
```

---

## 🔍 Coverage Reports

### Viewing Coverage

หลังจากรัน `npm run test:coverage`, จะสร้าง coverage report ที่:

```
coverage/
├── lcov-report/
│   └── index.html    <- เปิดไฟล์นี้ใน browser
└── lcov.info
```

### Coverage Thresholds

ใน `jest.config.js` เรากำหนด minimum coverage:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

---

## 🐛 Debugging Tests

### 1. Using screen.debug()

```typescript
it('should render', () => {
  render(<Component />);
  screen.debug(); // Prints DOM tree
});
```

### 2. Using console.log

```typescript
it('should work', () => {
  const { result } = renderHook(() => useCart());
  console.log(result.current.cart);
});
```

### 3. Running Single Test

```bash
# Run specific file
npm test Button.test.tsx

# Run specific test
npm test -- -t "should render correctly"
```

---

## 📚 Additional Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🎓 Example Test Commands

```bash
# รัน tests ทั้งหมด
npm test

# รัน tests สำหรับ CartContext
npm test CartContext

# รัน tests ที่มีชื่อว่า "should add item"
npm test -- -t "should add item"

# รัน tests แบบ verbose
npm test -- --verbose

# Update snapshots
npm test -- -u

# รัน tests ที่เปลี่ยนแปลง (based on git)
npm test -- --changedSince=main
```

---

**Created:** 3 November 2025
**Status:** Ready for Implementation
