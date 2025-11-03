# Testing Checklist - Delivery Genie Dashboard

**วันที่:** 3 พฤศจิกายน 2025
**Checkpoint:** Frontend Navigation & Shopping System

---

## 📋 Manual Testing Checklist

### 1. Authentication & Authorization

#### Login Flow
- [ ] **Test Case 1.1:** Login with valid admin credentials
  - Input: `admin@deliverygenie.com` / `admin123`
  - Expected: Redirect to `/` (Dashboard)
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 1.2:** Login with valid user credentials
  - Input: `user@deliverygenie.com` / `user123`
  - Expected: Redirect to `/shop`
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 1.3:** Login with invalid credentials
  - Input: `wrong@email.com` / `wrongpass`
  - Expected: Error message displayed
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 1.4:** Login with empty fields
  - Input: Empty email/password
  - Expected: HTML5 validation error
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 1.5:** Logout functionality
  - Action: Click logout button
  - Expected: Redirect to `/auth/login` and session cleared
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Role-Based Access Control
- [ ] **Test Case 2.1:** User access to Dashboard
  - Login as: User
  - Try to access: `/` (Dashboard)
  - Expected: Redirect to `/shop`
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 2.2:** User access to Admin routes
  - Login as: User
  - Try to access: `/admin/users`
  - Expected: Redirect to `/shop`
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 2.3:** Admin access to all routes
  - Login as: Admin
  - Try to access: Dashboard, Shop, Admin pages
  - Expected: Access granted to all
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 2.4:** Unauthenticated access to protected routes
  - Action: Access `/shop/checkout` without login
  - Expected: Redirect to `/auth/login`
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 2. Navigation Menu

#### User Role Menu
- [ ] **Test Case 3.1:** User sees only Shopping menu
  - Login as: User
  - Open hamburger menu
  - Expected: See only "ช้อปสินค้า" and "ตะกร้าสินค้า"
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 3.2:** Menu displays user info
  - Login as: Any user
  - Open menu
  - Expected: Shows name, email, role badge
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Admin Role Menu
- [ ] **Test Case 4.1:** Admin sees all menu sections
  - Login as: Admin
  - Open menu
  - Expected: See Dashboard, Shopping, Admin sections
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 4.2:** Menu navigation works
  - Click each menu item
  - Expected: Navigate to correct page and menu closes
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 3. Store Location & Finding

#### Geolocation
- [ ] **Test Case 5.1:** Allow geolocation access
  - Action: Visit `/shop`, allow location access
  - Expected: Shows "กำลังหา 7-11 ใกล้ฉัน..." then displays nearest store
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 5.2:** Deny geolocation access
  - Action: Visit `/shop`, deny location access
  - Expected: Error message with "ลองอีกครั้ง" button
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 5.3:** Geolocation timeout
  - Action: Simulate timeout (if possible)
  - Expected: Error message displayed
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 5.4:** No stores found within radius
  - Location: Remote area (if testable)
  - Expected: "ไม่พบร้านในพื้นที่ของคุณ" message
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Store Information Display
- [ ] **Test Case 6.1:** Store details shown correctly
  - Expected: Name, address, distance (km), duration (min)
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 4. Product Browsing

#### Product Display
- [ ] **Test Case 7.1:** Products load after store found
  - Expected: Product grid shows items from selected store
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 7.2:** Product information complete
  - Check: Name, price, stock quantity, category icon
  - Expected: All info displayed correctly
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 7.3:** Out of stock products
  - Expected: "เพิ่มลงตะกร้า" button disabled
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Search & Filter
- [ ] **Test Case 8.1:** Search by product name
  - Input: Product name (e.g., "น้ำ")
  - Expected: Shows only matching products
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 8.2:** Filter by category
  - Click: Each category button
  - Expected: Shows only products in that category
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 8.3:** "ทั้งหมด" shows all products
  - Click: "ทั้งหมด" button
  - Expected: All products displayed
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 8.4:** Search + Filter combination
  - Search: "น้ำ" + Filter: "เครื่องดื่ม"
  - Expected: Products match both criteria
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 8.5:** No results found
  - Search: Non-existent product
  - Expected: "ไม่พบสินค้า" message
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 5. Shopping Cart

#### Adding to Cart
- [ ] **Test Case 9.1:** Add product to cart
  - Action: Click "เพิ่มลงตะกร้า"
  - Expected: Cart badge count increases
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 9.2:** Add same product twice
  - Action: Add same product 2 times
  - Expected: Quantity increases, not duplicate entry
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 9.3:** Add multiple different products
  - Action: Add 3 different products
  - Expected: Cart shows 3 items
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Cart Page
- [ ] **Test Case 10.1:** Empty cart state
  - Action: Visit `/shop/cart` with empty cart
  - Expected: "ตะกร้าสินค้าว่างเปล่า" message with "เริ่มช้อปปิ้ง" button
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 10.2:** Cart displays all items
  - Expected: Shows all added products with correct info
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 10.3:** Store info displayed
  - Expected: Shows selected store name and address
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Quantity Management
- [ ] **Test Case 11.1:** Increase quantity
  - Action: Click + button
  - Expected: Quantity increases, total updates
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 11.2:** Decrease quantity
  - Action: Click - button
  - Expected: Quantity decreases, total updates
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 11.3:** Decrease to zero
  - Action: Decrease quantity to 0
  - Expected: Item removed from cart
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 11.4:** Increase beyond stock
  - Action: Try to increase beyond available stock
  - Expected: + button disabled
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 11.5:** Remove item
  - Action: Click "ลบ" button
  - Expected: Item removed, totals recalculated
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Cart Calculations
- [ ] **Test Case 12.1:** Subtotal calculation
  - Expected: Sum of (price × quantity) for all items
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 12.2:** Tax calculation (7%)
  - Expected: Subtotal × 0.07
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 12.3:** Shipping fee
  - Expected: ฿30.00 when cart has items, ฿0.00 when empty
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 12.4:** Total calculation
  - Expected: Subtotal + Tax + Shipping
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Cart Persistence
- [ ] **Test Case 13.1:** Cart persists after page reload
  - Action: Add items, reload page
  - Expected: Cart items still present
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 13.2:** Cart persists across navigation
  - Action: Add items, navigate to different page, come back
  - Expected: Cart items maintained
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 6. Checkout Process

#### Checkout Access
- [ ] **Test Case 14.1:** Checkout requires login
  - Action: Access `/shop/checkout` without login
  - Expected: Redirect to login page
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 14.2:** Checkout with empty cart
  - Action: Access checkout with no items
  - Expected: Redirect to `/shop`
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Store Finding
- [ ] **Test Case 15.1:** Re-fetch nearest store
  - Expected: Shows "กำลังหา 7-11 ใกล้ฉัน..." then store info
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 15.2:** Store finding failure
  - Expected: Error message with retry options
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Form Validation
- [ ] **Test Case 16.1:** Submit with empty required fields
  - Action: Click submit without filling required fields
  - Expected: HTML5 validation errors
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 16.2:** Phone number format
  - Input: Invalid phone format
  - Expected: (Currently no validation - should be added)
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 16.3:** Email format
  - Input: Invalid email
  - Expected: HTML5 email validation
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 16.4:** Date validation
  - Input: Past date
  - Expected: Blocked by min date attribute
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Order Creation
- [ ] **Test Case 17.1:** Successful order creation
  - Action: Fill all fields, submit
  - Expected: Redirect to order success page, cart cleared
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 17.2:** Order creation failure
  - Expected: Error message displayed, cart not cleared
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 17.3:** Loading state during submission
  - Expected: Button shows "กำลังสร้างคำสั่งซื้อ..." and is disabled
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Order Summary
- [ ] **Test Case 18.1:** All items displayed
  - Expected: Shows all cart items with quantities
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 18.2:** Totals match cart
  - Expected: Same subtotal, tax, shipping, total as cart page
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 7. Edge Cases & Error Scenarios

#### Network Errors
- [ ] **Test Case 19.1:** API timeout
  - Simulate: Slow/no network
  - Expected: Error message after timeout
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 19.2:** API returns 500 error
  - Expected: User-friendly error message
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 19.3:** Offline mode
  - Action: Disable network, try to load shop
  - Expected: Network error message
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### LocalStorage
- [ ] **Test Case 20.1:** LocalStorage disabled
  - Expected: Cart still works (in memory only)
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 20.2:** LocalStorage full
  - Expected: Graceful handling
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 20.3:** Corrupted cart data
  - Action: Manually corrupt localStorage data
  - Expected: Cart reset, no crash
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Browser Compatibility
- [ ] **Test Case 21.1:** Chrome
  - Version: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 21.2:** Firefox
  - Version: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 21.3:** Safari
  - Version: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 21.4:** Mobile Safari (iOS)
  - Version: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 21.5:** Mobile Chrome (Android)
  - Version: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 8. Responsive Design

#### Mobile (< 768px)
- [ ] **Test Case 22.1:** Navigation menu
  - Expected: Hamburger menu works properly
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 22.2:** Product grid
  - Expected: 2 columns on mobile
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 22.3:** Cart layout
  - Expected: Single column, sticky summary
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 22.4:** Checkout form
  - Expected: Full width, proper spacing
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Tablet (768px - 1024px)
- [ ] **Test Case 23.1:** Product grid
  - Expected: 3 columns
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 23.2:** Cart layout
  - Expected: 2 columns (items + summary)
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Desktop (> 1024px)
- [ ] **Test Case 24.1:** Product grid
  - Expected: 4-5 columns
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 24.2:** All layouts optimal
  - Expected: Proper spacing and readability
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 9. Accessibility Testing

#### Keyboard Navigation
- [ ] **Test Case 25.1:** Tab through all interactive elements
  - Expected: Logical tab order, visible focus indicators
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 25.2:** Enter/Space to activate buttons
  - Expected: All buttons work with keyboard
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 25.3:** Escape to close menu
  - Expected: Hamburger menu closes on Escape
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Screen Reader
- [ ] **Test Case 26.1:** NVDA/JAWS compatibility
  - Expected: All content announced properly
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 26.2:** Loading states announced
  - Expected: Screen reader announces loading
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 26.3:** Error messages announced
  - Expected: Errors announced to screen reader
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Color Contrast
- [ ] **Test Case 27.1:** Text readability
  - Tool: WAVE or axe DevTools
  - Expected: WCAG AA compliance
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

### 10. Performance Testing

#### Load Times
- [ ] **Test Case 28.1:** Initial page load
  - Expected: < 3 seconds
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 28.2:** Product loading
  - Expected: < 2 seconds after store found
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

#### Large Carts
- [ ] **Test Case 29.1:** 50+ items in cart
  - Expected: No performance degradation
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

- [ ] **Test Case 29.2:** Rapid quantity changes
  - Action: Quickly click +/- buttons
  - Expected: Smooth updates, no lag
  - Actual: _____
  - Status: ⬜ Pass / ⬜ Fail

---

## 🧪 Automated Testing Todos

### Unit Tests (Jest + React Testing Library)

#### CartContext Tests
- [ ] Should add item to cart
- [ ] Should update item quantity
- [ ] Should remove item from cart
- [ ] Should calculate totals correctly
- [ ] Should persist to localStorage
- [ ] Should handle localStorage errors

#### Component Tests
- [ ] Button - renders all variants
- [ ] Button - handles loading state
- [ ] Button - disabled state
- [ ] LoadingSpinner - renders with message
- [ ] Card - renders with action button
- [ ] Navigation - shows correct menu based on role

#### API Route Tests
- [ ] `/api/stores/nearest` - finds stores successfully
- [ ] `/api/stores/nearest` - handles no stores found
- [ ] `/api/stores/[storeId]/products` - returns products
- [ ] `/api/stores/[storeId]/products` - filters by category

### Integration Tests
- [ ] Login → Shop → Add to Cart → Checkout flow
- [ ] Cart persistence across page reloads
- [ ] Role-based access control

### E2E Tests (Playwright/Cypress)
- [ ] Complete purchase flow
- [ ] Admin dashboard access
- [ ] Error scenarios

---

## 📊 Testing Summary

**Total Test Cases:** 29 sections, 100+ individual tests
**Priority Tests:**
- 🔴 Critical: Authentication, Cart, Checkout (40 tests)
- 🟡 High: Search, Filter, RBAC (30 tests)
- 🟢 Medium: Edge cases, Responsive (20 tests)
- 🔵 Low: Accessibility, Performance (10+ tests)

**Testing Tools Needed:**
- Manual testing in browsers
- Jest + React Testing Library
- Playwright/Cypress
- axe DevTools
- Lighthouse

---

**Created:** 3 November 2025
**Last Updated:** 3 November 2025
**Status:** Ready for QA Team
