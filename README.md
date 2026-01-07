# Amplify JWT Groups Issue Reproduction

This app reproduces the TypeScript typing issue described in [AWS Amplify JS Issue #13021](https://github.com/aws-amplify/amplify-js/issues/13021).

## The Issue

When using `fetchAuthSession()` to retrieve JWT payload data, the TypeScript types for `JwtPayload` are missing:
- `cognito:groups` attribute (contains user's Cognito User Pool groups)
- `scope` attribute

The actual runtime data contains these properties, but TypeScript doesn't recognize them, causing type errors.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Amplify CLI (if not already installed):**
   ```bash
   npm install -g @aws-amplify/cli@latest
   ```

3. **Deploy the backend:**
   ```bash
   npx ampx sandbox
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Reproducing the Issue

1. **Create a user account** through the Authenticator UI
2. **Sign in** with your new account
3. **Observe the TypeScript errors** in the browser console and in your IDE
4. **Check the JWT payload** displayed in the UI - you'll see it contains `cognito:groups` at runtime
5. **Assign user to groups** via AWS Console (optional, to see groups in payload)

## Expected vs Actual Behavior

### Expected
The `JwtPayload` type should include:
```typescript
interface JwtPayload {
  // ... existing properties
  'cognito:groups'?: string[];
  scope?: string;
}
```

### Actual
These properties are missing from the type definition, causing TypeScript errors when trying to access them, even though they exist at runtime.

## Assigning Users to Groups

To see the `cognito:groups` in the JWT payload:

1. Go to AWS Console → Cognito → User Pools
2. Find your user pool (created by Amplify)
3. Go to "Groups" tab and create groups: Admin, SuperUser, User
4. Go to "Users" tab, select your user, and assign them to a group
5. Refresh the JWT payload in the app to see the groups

## Files Demonstrating the Issue

- `src/App.tsx` - Shows the TypeScript errors and runtime behavior
- The app uses `@ts-expect-error` comments to suppress TypeScript errors for demonstration

## Workaround

Currently, you need to extend the interface manually:
```typescript
interface JwtPayloadWithGroups extends JwtPayload {
  'cognito:groups'?: string[]
  scope?: string
}
```