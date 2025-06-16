# Adhyayan AI - Blockchain-Powered Educational Platform

A full-stack educational platform integrating Aptos blockchain payments, Civic wallet authentication, and AI-powered learning tools with real on-chain transactions and Gyan points rewards system.

## 🏗️ Architecture Overview

### Frontend (Next.js + TypeScript)
- **Authentication**: Civic wallet integration for secure login
- **Payments**: Real Aptos blockchain transactions with APT cryptocurrency
- **AI Learning**: Mind mapping, content generation, and educational tools
- **Rewards**: Gyan points system tied to blockchain transactions
- **UI**: Modern React components with Tailwind CSS

### Backend (Node.js + Express)
- **Database**: MongoDB for user data and transaction records
- **AI Services**: Multiple Groq API integrations for content generation
- **File Processing**: PDF, image, and document parsing
- **Audio**: ElevenLabs text-to-speech integration

### Blockchain (Aptos Move)
- **Smart Contract**: Subscription and payment management
- **Auto-funding**: New wallets receive 1 APT automatically via devnet faucet
- **Plans**: Multiple subscription and top-up options
- **Security**: Sponsored payments fallback when user wallets fail

### Database (MongoDB)
- **Users**: Profile data, Gyan points, subscription status
- **Transactions**: Complete payment history with blockchain attribution
- **Content**: Educational materials and user-generated content

## 🔗 Civic + Aptos Integration

### How It Works
1. **User Login**: Civic provides secure authentication and wallet connection
2. **Payment Attribution**: Payments are attributed to the authenticated Civic wallet address
3. **Auto-funding**: New wallets automatically receive 1 APT from devnet faucet
4. **Dual Payment Flow**: 
   - Primary: User wallet signs transaction (sponsor mode for future)
   - Fallback: Test account pays on behalf of user if Civic signing fails
5. **Gyan Points**: Real blockchain transactions award points based on plan value

### Key Files
- `client/lib/aptos-civic-integration.ts` - Core payment and wallet logic
- `client/lib/civic-wallet-provider-simple.tsx` - Civic authentication wrapper
- `client/lib/aptos-payment.ts` - Currency conversion and payment utilities
- `client/lib/use-aptos-wallet.ts` - Wallet connection hook

## 💰 Payment System

### Supported Plans

#### Subscription Plans
- **Student Plan**: ₹99/month → ~0.03 APT
- **Scholar Plan**: ₹199/month → ~0.06 APT  
- **Institution Plan**: ₹999/month → ~0.3 APT

#### Top-up Plans
- **Quick Boost**: ₹49 → ~0.015 APT (100 Gyan points)
- **Power Pack**: ₹99 → ~0.03 APT (250 Gyan points)
- **Mega Bundle**: ₹199 → ~0.06 APT (600 Gyan points)

### Currency Conversion
- Real-time INR to APT conversion at ~₹3300 per APT
- Automatic octas (smallest APT unit) conversion
- Price updates configurable in `aptos-payment.ts`

### Payment Flow
1. User selects plan on pricing page
2. Civic wallet authentication required
3. Auto-funding occurs for new wallets (1 APT from faucet)
4. Smart contract call attempts with user wallet
5. Fallback to sponsored payment if user wallet fails
6. Transaction recorded in MongoDB with full details
7. Gyan points awarded based on plan value
8. Real-time balance updates on dashboard

## 🏦 Smart Contract (Move)

### Contract Address
- **Devnet**: `0xb0f6a166613cf91c639fb89f77f6764bae08242775a1d5a16ad14cb2a85993f9`

### Key Functions
- `subscribe(plan_id, amount)` - Process subscription payments
- `top_up(plan_id, amount)` - Handle one-time top-ups  
- `add_plan(id, name, price, duration)` - Admin function to add new plans
- `is_subscription_active(user, plan_id)` - Check subscription status

### Plan IDs (Contract)
Both hyphen and underscore versions supported:
- `student-plan` / `student_plan`
- `scholar-plan` / `scholar_plan`
- `institution-plan` / `institution_plan`
- `quick-boost` / `quick_boost`
- `power-pack` / `power_pack`
- `mega-bundle` / `mega_bundle`

## 📊 Gyan Points System

### Point Values
- **Student Plan**: 500 points
- **Scholar Plan**: 1,000 points
- **Institution Plan**: 5,000 points
- **Quick Boost**: 100 points
- **Power Pack**: 250 points
- **Mega Bundle**: 600 points

### Implementation
- Points awarded after successful blockchain transaction
- Stored in MongoDB with user profile
- Real-time updates on dashboard with refresh functionality
- Manual refresh button for immediate point updates

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB Atlas account or local MongoDB
- Aptos CLI installed
- Civic developer account

### 1. Clone Repository
```bash
git clone <repository-url>
cd adhyayan-ai
```

### 2. Install Dependencies

#### Frontend
```bash
cd client
npm install
```

#### Backend
```bash
cd server
npm install
```

### 3. Environment Configuration

#### Client (.env.local)
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api
GROQ_API_KEY=your_groq_api_key

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Civic Configuration
NEXT_PUBLIC_CIVIC_CLIENT_ID=your_civic_client_id
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CIVIC_CLIENT_ID=your_civic_client_id

# Aptos Configuration
NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
NEXT_PUBLIC_APTOS_RECEIVER_ADDRESS=your_contract_address
NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS=your_contract_address

# Private Keys (Keep Secure!)
NEXT_PUBLIC_TEST_PRIVATE_KEY=your_test_account_private_key
ADMIN_PRIVATE_KEY=your_admin_private_key
```

#### Server (.env)
```env
PORT=5000
JWT_SECRET=your_jwt_secret

# Firebase Admin
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Groq API Keys
GROQ_API_KEY=your_groq_api_key
PARSING_GROQ_API_KEY=your_parsing_groq_api_key
DESCRIPTION_GROQ_API_KEY=your_description_groq_api_key

# Additional APIs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GEMINI_API_KEY=your_gemini_api_key
QUERY_GEMINI_API_KEY=your_query_gemini_api_key
```

### 4. Blockchain Setup

#### Deploy Contract
```bash
cd contract
aptos init --network devnet
aptos move publish --named-addresses AdhyayanPayment=your_account_address
```

#### Fund Accounts
```bash
# Fund your admin account
aptos account fund-with-faucet --account your_account_address

# Fund your test account  
aptos account fund-with-faucet --account your_test_account_address
```

#### Initialize Contract Plans
```bash
cd client
export ADMIN_PRIVATE_KEY="your_admin_private_key"
npx tsx scripts/initialize-plans.ts
```

### 5. Run Development Servers

#### Start Backend
```bash
cd server
npm start
```

#### Start Frontend
```bash
cd client
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 📁 Key File Structure

### Frontend Core Files
- `app/page.tsx` - Landing page with pricing
- `app/dashboard/page.tsx` - User dashboard with Gyan points
- `app/confirm/page.tsx` - Payment confirmation
- `app/payment-success/page.tsx` - Success page
- `app/api/payments/record/route.ts` - Payment recording API
- `app/api/user/route.ts` - User profile API

### Payment Integration
- `lib/aptos-civic-integration.ts` - Main payment logic (627 lines)
- `lib/aptos-payment.ts` - Currency conversion utilities
- `lib/civic-wallet-provider-simple.tsx` - Civic authentication
- `lib/use-aptos-wallet.ts` - Wallet connection hook
- `lib/gyan-points-utils.ts` - Points calculation

### Smart Contract
- `contract/sources/subscription.move` - Main contract logic
- `contract/Move.toml` - Contract configuration

### Utilities
- `scripts/initialize-plans.ts` - Contract plan setup
- `scripts/test-contract.ts` - Contract testing utilities

## 🔧 Development Features

### Auto-funding System
New Civic wallets automatically receive 1 APT via the devnet faucet:
- Detects new wallet addresses
- Calls Aptos devnet faucet API
- Provides welcome message to user
- Enables immediate payments without manual funding

### Dual Payment Flow
Robust payment system with fallback:
1. **Primary**: User wallet signs transaction (sponsor mode)
2. **Fallback**: Test account pays on behalf of user
3. Both methods properly attribute payment to user's Civic wallet

### Real-time Updates
- Dashboard auto-refreshes Gyan points after payments
- Manual refresh button for immediate updates
- Event-driven UI updates using React hooks

### Error Handling
- Comprehensive try-catch blocks throughout payment flow
- Graceful fallbacks when blockchain calls fail
- Detailed logging for debugging payment issues

## 🔒 Security Considerations

### Environment Variables
All sensitive data stored in environment variables:
- Private keys never hardcoded in source
- API keys secured in .env files
- Database URIs protected
- Contract addresses configurable

### Payment Security
- Real blockchain transactions provide immutable payment records
- Civic authentication ensures wallet ownership
- Smart contract validation prevents invalid payments
- Sponsored payment fallback maintains user experience

### Data Protection
- MongoDB connections secured with authentication
- Firebase admin SDK for secure user management
- JWT tokens for API authentication
- CORS properly configured for API access

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Connect repository to platform
2. Set environment variables in platform dashboard
3. Configure build settings for Next.js
4. Deploy with automatic CI/CD

### Backend (Railway/Heroku)
1. Create new service/app
2. Configure environment variables
3. Set start command to `npm start`
4. Deploy with Git integration

### Smart Contract (Aptos Mainnet)
1. Switch to mainnet configuration
2. Fund mainnet accounts
3. Deploy contract with mainnet addresses
4. Update frontend environment variables

## 📈 Monitoring & Analytics

### Transaction Tracking
- All payments logged in MongoDB
- Blockchain transaction hashes stored
- User attribution via Civic wallet addresses
- Gyan points distribution tracked

### Error Monitoring
- Comprehensive logging throughout payment flow
- Failed transaction tracking
- Auto-funding success/failure monitoring
- Fallback payment usage statistics

## 🤝 Contributing

### Development Setup
1. Follow setup instructions above
2. Create feature branch from main
3. Test payment flows thoroughly
4. Update documentation for new features
5. Submit pull request with detailed description

### Testing Payments
1. Use new Civic wallet for testing
2. Verify auto-funding works
3. Test both user wallet and fallback payments
4. Confirm Gyan points are awarded correctly
5. Check MongoDB transaction records

## 📞 Support

For issues or questions:
- Check error logs in browser console
- Review MongoDB transaction records
- Verify Aptos explorer transaction status
- Check environment variable configuration

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ by Team 4bidden using Aptos blockchain, Civic authentication, MongoDB, Gemini API, Next.js & express**

## 🔧 Technical Deep Dive: Problems Faced & Solutions

### 🚨 Major Challenges We Overcame

#### 1. **Civic Wallet Integration with Aptos Payments**

**Problem**: Civic provides authentication but doesn't handle Aptos transactions directly. Users authenticate with Civic, but we needed to enable them to pay with APT cryptocurrency on Aptos blockchain.

**Solution**: 
- Created a bridge between Civic authentication and Aptos payments
- Used Civic wallet address as the user identifier for payment attribution
- Implemented dual payment flow: user wallet + sponsored fallback

```typescript
// Key integration in aptos-civic-integration.ts
const civicWallet = await getCivicWallet(); // Civic auth
const aptosWallet = new AptosWallet(civicWallet.publicKey); // Aptos integration
```

#### 2. **User Wallet Empty on First Use (Cold Start Problem)**

**Problem**: New users authenticate with Civic but have 0 APT balance, making payments impossible.

**Solutions Implemented**:
- **Auto-funding**: New wallets automatically receive 1 APT from devnet faucet
- **Sponsored payments**: Test account pays on behalf of user when wallet is empty
- **Seamless UX**: Users don't need to manually fund wallets or understand APT

```typescript
// Auto-funding implementation
async function autoFundNewWallet(walletAddress: string) {
  const response = await fetch('https://faucet.devnet.aptoslabs.com/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: walletAddress,
      amount: 100000000 // 1 APT in octas
    })
  });
}
```

#### 3. **Plan ID Mismatch Between Frontend and Contract**

**Problem**: Frontend used hyphenated plan IDs (`student-plan`) but contract expected underscores (`student_plan`). Payments failed due to plan not found.

**Solution**: 
- Added both formats in contract initialization
- Created mapping function to handle both naming conventions
- Contract now accepts: `student-plan`, `student_plan`, `scholar-plan`, `scholar_plan`, etc.

```move
// Contract supports both formats
public entry fun subscribe(user: &signer, plan_id: vector<u8>, amount: u64) {
    // Accepts both "student-plan" and "student_plan"
}
```

#### 4. **Gyan Points Not Reflecting After Payment**

**Problem**: Users made successful payments but Gyan points weren't updating in dashboard.

**Root Causes & Solutions**:
- **API mismatch**: Backend used different plan values than frontend
- **Database connection**: Payment API was using mock data instead of real MongoDB
- **Real-time updates**: Dashboard wasn't refreshing after payments

```typescript
// Fixed in gyan-points-utils.ts
export const PLAN_GYAN_POINTS: Record<string, number> = {
  'student-plan': 500,     // Backend matches frontend
  'scholar-plan': 1000,
  'quick-boost': 100,      // Consistent naming
  // ... all plans aligned
};
```

#### 5. **Currency Conversion Accuracy**

**Problem**: INR to APT conversion was hardcoded and inaccurate, leading to incorrect payment amounts.

**Solution**: 
- Researched real APT market price (~₹3300 per APT)
- Implemented proportional conversion with buffer for price fluctuations
- Created utility functions for consistent conversion throughout app

```typescript
// Accurate conversion in aptos-payment.ts
export const convertINRToAPT = (inrAmount: number): number => {
  const APT_PRICE_INR = 3300; // Current market rate
  const aptAmount = inrAmount / APT_PRICE_INR;
  return Math.ceil(aptAmount * 1000) / 1000; // Round up for buffer
};
```

#### 6. **Civic Wallet Signing Limitations**

**Problem**: Civic wallet couldn't always sign Aptos transactions due to network/permission issues.

**Solution**: Implemented robust dual-payment system:
1. **Primary**: Attempt user wallet payment
2. **Fallback**: Use test account for sponsored payment
3. **Attribution**: Both methods properly credit the user's Civic wallet

```typescript
// Dual payment flow
try {
  // Step 1: Try user wallet payment
  const userResult = await attemptUserWalletPayment(civicWallet, amount);
  if (userResult.success) return userResult;
} catch (error) {
  // Step 2: Fallback to sponsored payment
  const sponsoredResult = await sponsoredPayment(testAccount, civicWallet.address, amount);
  return sponsoredResult;  // Still attributed to user
}
```

### 🏗️ How the Complete Payment System Works

#### Step-by-Step Payment Flow:

1. **User Authentication**
   ```typescript
   // User clicks login -> Civic modal opens
   const civicWallet = await window.civic.connect();
   // Returns: { address: "0x123...", publicKey: "...", isConnected: true }
   ```

2. **Plan Selection & Pricing**
   ```typescript
   // User selects "Student Plan" -> ₹99/month
   const aptAmount = convertINRToAPT(99); // 0.03 APT
   const octas = aptToOctas(aptAmount);   // 3000000 octas
   ```

3. **Wallet Balance Check & Auto-funding**
   ```typescript
   const balance = await getWalletBalance(civicWallet.address);
   if (balance < requiredAmount) {
     await autoFundWallet(civicWallet.address); // +1 APT from faucet
   }
   ```

4. **Smart Contract Payment**
   ```typescript
   // Build transaction
   const transaction = await client.transaction.build.simple({
     sender: civicWallet.address,
     data: {
       function: `${CONTRACT_ADDRESS}::subscription::subscribe`,
       functionArguments: [
         Array.from(new TextEncoder().encode("student-plan")),
         octas // 3000000
       ]
     }
   });
   
   // Sign & submit (user wallet or sponsored fallback)
   const result = await client.signAndSubmitTransaction({
     signer: walletSigner,
     transaction
   });
   ```

5. **Database Recording**
   ```typescript
   // Record in MongoDB with full transaction details
   await recordPayment({
     userId: userEmail,
     civicWalletAddress: civicWallet.address,
     planId: "student-plan",
     amount: 99,
     currency: "INR",
     aptAmount: 0.03,
     transactionHash: result.hash,
     gyanPointsAwarded: 500,
     timestamp: new Date()
   });
   ```

6. **Gyan Points Update & UI Refresh**
   ```typescript
   // Update user points in database
   await updateUserGyanPoints(userEmail, 500);
   
   // Trigger UI refresh
   window.dispatchEvent(new CustomEvent('gyanPointsUpdated'));
   ```

### 🌐 Production vs Development: How Real Users Pay

#### Development (Current - Devnet)
- **Network**: Aptos Devnet
- **Funding**: Free APT from devnet faucet
- **Cost**: $0 for users (test network)
- **Purpose**: Testing and development

#### Production (Mainnet Implementation)

**For Real Users with Real Money**:

1. **Network Configuration**
   ```typescript
   // Switch from devnet to mainnet
   const config = new AptosConfig({ 
     network: Network.MAINNET  // Real Aptos network
   });
   ```

2. **Real APT Purchase Options**:
   - **Option A**: Users buy APT on exchanges (Binance, Coinbase, etc.)
   - **Option B**: We provide APT purchase integration
   - **Option C**: Credit card → APT conversion service

3. **Fiat-to-APT Integration** (Recommended):
   ```typescript
   // Integration with services like MoonPay, Simplex, or Transak
   const purchaseAPT = async (fiatAmount: number, userWallet: string) => {
     const response = await moonpay.createTransaction({
       baseCurrencyAmount: fiatAmount,
       baseCurrencyCode: 'inr',
       currencyCode: 'apt',
       walletAddress: userWallet,
       redirectURL: 'https://adhyayan.ai/payment-success'
     });
     return response.url; // User completes purchase on MoonPay
   };
   ```

4. **Production Payment Flow**:
   ```typescript
   // Real mainnet payment
   async function productionPayment(user: User, plan: Plan) {
     // 1. Check mainnet APT balance
     const balance = await getMainnetBalance(user.wallet);
     
     // 2. If insufficient, redirect to APT purchase
     if (balance < plan.aptCost) {
       return redirectToAPTPurchase(plan.aptCost, user.wallet);
     }
     
     // 3. Execute real mainnet transaction
     const txn = await executeMainnetPayment({
       wallet: user.wallet,
       contract: MAINNET_CONTRACT_ADDRESS,
       amount: plan.aptCost
     });
     
     // 4. Transaction costs real money (network fees + subscription)
     return txn.hash;
   }
   ```

### 💳 Real-World Payment Implementation for Production Users

### 🌍 How Normal Users Actually Pay (Production Ready)

Our system is designed to work for regular users who don't own cryptocurrency. Here's exactly how we handle real-world payments:

#### Scenario 1: Traditional Indian User
**User Profile**: College student in Mumbai, has never used cryptocurrency, wants to subscribe to Student Plan (₹99/month)

**Payment Journey**:
1. **Login**: User clicks "Login with Civic" → authenticates with phone/email
2. **Plan Selection**: Chooses Student Plan → sees ₹99/month pricing
3. **Payment Method**: User sees familiar payment options:
   ```
   💳 Pay with Card/UPI (₹99)
   🏦 Net Banking (₹99)  
   📱 UPI (₹99)
   💰 Pay with APT (0.03 APT) [for crypto users]
   ```

4. **Fiat Payment Processing**:
   ```typescript
   // User pays ₹99 via Razorpay (Indian payment gateway)
   const razorpayOrder = await razorpay.orders.create({
     amount: 9900, // ₹99 in paise
     currency: 'INR',
     receipt: `sub_${userId}_${Date.now()}`,
     payment_capture: 1
   });
   
   // User completes payment with UPI/Card
   const paymentResult = await razorpay.confirmPayment(razorpayOrder.id);
   ```

5. **Background APT Conversion**:
   ```typescript
   // Our backend automatically converts INR to APT and pays contract
   const aptAmount = convertINRToAPT(99); // 0.03 APT
   const contractPayment = await sponsoredPayment({
     userCivicWallet: user.walletAddress,
     planId: 'student-plan',
     aptAmount: aptAmount,
     paidBy: 'our_company_wallet', // We handle crypto
     fiatReference: paymentResult.razorpay_payment_id
   });
   ```

6. **User Experience**:
   - ✅ User paid ₹99 in INR (familiar currency)
   - ✅ Gets subscription immediately
   - ✅ Receives 500 Gyan points
   - ✅ Never touched cryptocurrency
   - ✅ Blockchain benefits (transparent, immutable records)

#### Scenario 2: Crypto-Native User
**User Profile**: Tech professional who already owns APT cryptocurrency

**Payment Journey**:
1. **Direct Wallet Payment**: User chooses "Pay with APT"
2. **Wallet Connection**: Civic wallet already connected and funded
3. **Direct Transaction**: User signs transaction directly
   ```typescript
   // User's wallet pays contract directly
   const userTransaction = await civicWallet.signAndSubmit({
     function: `${CONTRACT}::subscription::subscribe`,
     arguments: ['student-plan', aptAmount]
   });
   ```
4. **Immediate Confirmation**: Transaction completed in ~3 seconds

#### Scenario 3: International User  
**User Profile**: Student in USA, wants Institution Plan ($12/month equivalent)

**Payment Journey**:
1. **Currency Detection**: System detects location → shows USD pricing
2. **Payment Options**:
   ```
   💳 Credit Card ($12) → Stripe
   🏦 Bank Transfer ($12) → Wise/Stripe
   💰 Pay with APT (0.003 APT)
   ```
3. **Fiat Processing**: 
   ```typescript
   // Stripe handles international payments
   const stripePayment = await stripe.paymentIntents.create({
     amount: 1200, // $12 in cents
     currency: 'usd',
     customer: user.stripeCustomerId,
     metadata: { plan: 'institution-plan', civic_wallet: user.walletAddress }
   });
   ```

### 🏗️ Production Payment Architecture

#### Backend Payment Service
```typescript
// server/services/payment-service.js
class PaymentService {
  async processSubscription(user, plan, paymentMethod) {
    switch(paymentMethod.type) {
      case 'fiat_inr':
        return await this.handleRazorpayPayment(user, plan, paymentMethod);
      case 'fiat_usd':
        return await this.handleStripePayment(user, plan, paymentMethod);
      case 'crypto_apt':
        return await this.handleDirectAPTPayment(user, plan, paymentMethod);
      case 'sponsored':
        return await this.handleSponsoredPayment(user, plan, paymentMethod);
    }
  }
  
  async handleRazorpayPayment(user, plan, payment) {
    // 1. Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.inrPrice * 100,
      currency: 'INR'
    });
    
    // 2. After user pays, convert to APT and pay contract
    const aptAmount = convertINRToAPT(plan.inrPrice);
    const contractTxn = await this.payContractOnBehalfOf(user.civicWallet, aptAmount);
    
    // 3. Record both fiat and crypto transactions
    return {
      fiatPayment: order.id,
      cryptoTransaction: contractTxn.hash,
      gyanPointsAwarded: plan.gyanPoints
    };
  }
}
```

#### Frontend Payment Selection
```typescript
// client/components/PaymentSelector.tsx
const PaymentSelector = ({ plan, user }) => {
  const [paymentMethod, setPaymentMethod] = useState('fiat');
  
  return (
    <div className="payment-options">
      {/* Fiat Payment (Default) */}
      <PaymentOption 
        id="fiat"
        title="Pay with Card/UPI"
        description={`₹${plan.inrPrice} - Instant activation`}
        icon="💳"
        recommended={true}
      />
      
      {/* Crypto Payment (For Advanced Users) */}
      <PaymentOption 
        id="crypto"
        title="Pay with APT"
        description={`${plan.aptPrice} APT - Direct blockchain payment`}
        icon="🪙"
        advanced={true}
      />
      
      {/* Payment Processing */}
      {paymentMethod === 'fiat' && (
        <RazorpayCheckout 
          amount={plan.inrPrice}
          onSuccess={handleFiatSuccess}
        />
      )}
      
      {paymentMethod === 'crypto' && (
        <CryptoPayment 
          aptAmount={plan.aptPrice}
          onSuccess={handleCryptoSuccess}
        />
      )}
    </div>
  );
};
```

### 💰 Revenue Model & Cost Structure

#### For Us (Company):
```
User pays ₹99 INR → Razorpay fee (₹2) → We receive ₹97
We buy 0.03 APT → Costs ~₹99 → We pay contract 0.03 APT
Net: Break-even on first month, profit on renewals
```

#### Cost Breakdown:
- **Payment Gateway Fees**: 2-3% for Razorpay/Stripe
- **APT Purchase**: Market rate (₹3300/APT currently)
- **Gas Fees**: ~0.0001 APT per transaction (~₹0.33)
- **Net Margin**: Profitable after accounting for lower crypto volatility risk

### 🔄 Subscription Management

#### Auto-renewal System:
```typescript
// Cron job for subscription renewals
const renewSubscriptions = async () => {
  const expiringSubscriptions = await getExpiringSubscriptions();
  
  for (const subscription of expiringSubscriptions) {
    try {
      // Attempt to charge saved payment method
      const renewal = await chargeCustomer(subscription.customerId, subscription.planPrice);
      
      if (renewal.success) {
        // Convert to APT and extend blockchain subscription
        const aptAmount = convertINRToAPT(subscription.planPrice);
        await extendSubscription(subscription.civicWallet, aptAmount);
        
        // Award Gyan points for loyalty
        await awardGyanPoints(subscription.userId, subscription.planPoints);
      }
    } catch (error) {
      // Handle failed renewals - send reminder emails
      await sendRenewalFailedEmail(subscription.userId);
    }
  }
};
```

### 🌐 Global Scaling Strategy

#### Phase 1: India (Current)
- **Payment**: Razorpay (UPI, Cards, Net Banking)
- **Currency**: INR
- **Features**: Full platform access

#### Phase 2: Southeast Asia
- **Payment**: Stripe + Local gateways
- **Currency**: USD, SGD, MYR
- **Localization**: Multi-language support

#### Phase 3: Global
- **Payment**: Stripe global
- **Currency**: USD, EUR, GBP
- **Features**: Enterprise plans, white-labeling

### 🔧 Technical Implementation Details

#### Database Schema for Payments:
```javascript
// MongoDB collections
const paymentSchema = {
  _id: ObjectId,
  userId: String,              // Google/Firebase user ID
  civicWalletAddress: String,  // Blockchain attribution
  planId: String,              // student-plan, scholar-plan, etc.
  
  // Fiat payment details
  fiatAmount: Number,          // 99 (INR)
  fiatCurrency: String,        // 'INR', 'USD'
  paymentGateway: String,      // 'razorpay', 'stripe'
  gatewayTransactionId: String, // razorpay_payment_xyz
  
  // Crypto payment details  
  aptAmount: Number,           // 0.03
  aptosTransactionHash: String, // 0xabc123...
  contractAddress: String,     // Smart contract used
  
  // Business logic
  gyanPointsAwarded: Number,   // 500
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  status: String,              // 'completed', 'failed', 'pending'
  
  createdAt: Date,
  updatedAt: Date
};
```

This system allows normal users to pay with familiar methods while still getting all the benefits of blockchain technology - transparency, immutability, and decentralized verification!
