import { useEffect, useState } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import outputs from '../amplify_outputs.json'

interface CustomJwtPayload {
  sub?: string
  aud?: string | string[]
  iss?: string
  exp?: number
  iat?: number
  [key: string]: any
}

interface JwtPayloadWithGroups extends CustomJwtPayload {
  'cognito:groups'?: string[]
  scope?: string
}

function App() {
  const [jwtPayload, setJwtPayload] = useState<CustomJwtPayload | null>(null)
  const [rawJwtToken, setRawJwtToken] = useState<string>('')
  const [decodedRawPayload, setDecodedRawPayload] = useState<any>(null)
  const [typeIssueDemo, setTypeIssueDemo] = useState<string>('')
  const [user, setUser] = useState<any>(null)

  const decodeJWT = (token: string) => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token')
      }
      
      // Decode the payload (second part)
      const payload = parts[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      return decoded
    } catch (error) {
      console.error('Error decoding JWT:', error)
      return null
    }
  }

  const fetchJwtPayload = async () => {
    try {
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken
      
      if (idToken) {
        console.log(" Here is the token: " + idToken.payload["cognito:groups"] + " " + idToken.payload['cognito:groups']);

        // Get the Amplify-typed payload
        const payload = idToken.payload
        setJwtPayload(payload)
        
        // Get the raw JWT token string
        const rawToken = idToken.toString()
        setRawJwtToken(rawToken)
        
        // Manually decode the raw JWT to show it contains cognito:groups
        const manuallyDecoded = decodeJWT(rawToken)
        setDecodedRawPayload(manuallyDecoded)
        
        // This will cause TypeScript errors - demonstrating the issue
        try {
          // This is the issue we're reproducing - cognito:groups missing from types
          const groups = payload['cognito:groups']
          // This is also missing from types
          const scope = payload.scope
          
          setTypeIssueDemo(`
TypeScript Issues Demonstrated:
1. payload['cognito:groups'] - Property 'cognito:groups' does not exist on type 'JwtPayload'
2. payload.scope - Property 'scope' does not exist on type 'JwtPayload'

Actual runtime values from Amplify payload:
- cognito:groups: ${JSON.stringify(groups)}
- scope: ${JSON.stringify(scope)}

Manually decoded raw JWT payload contains:
- cognito:groups: ${JSON.stringify(manuallyDecoded?.['cognito:groups'])}
- scope: ${JSON.stringify(manuallyDecoded?.scope)}
          `)
        } catch (error) {
          console.error('Error accessing JWT properties:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching auth session:', error)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  useEffect(() => {
    fetchJwtPayload()
    fetchCurrentUser()
  }, [])

  return (
    <Authenticator>
      {({ signOut, user: authUser }) => (
        <div className="app">
          <h1>Amplify JWT Groups Issue Reproduction</h1>
          
          <div className="success">
            <h3>✅ User Authenticated</h3>
            <p>Username: {authUser?.username}</p>
            <p>Email: {authUser?.signInDetails?.loginId}</p>
          </div>

          <button onClick={fetchJwtPayload}>Refresh JWT Payload</button>
          <button onClick={fetchCurrentUser}>Refresh User Info</button>
          <button onClick={signOut}>Sign Out</button>

          <div className="success">
            <h3>📋 Manual Group Assignment Instructions</h3>
            <p>To see <code>cognito:groups</code> in the JWT payload:</p>
            <ol>
              <li>Go to <strong>AWS Console → Cognito → User Pools</strong></li>
              <li>Find your user pool: <code>{outputs.auth.user_pool_id}</code></li>
              <li>Navigate to <strong>"Groups"</strong> tab</li>
              <li>Create groups: <strong>Admin</strong>, <strong>SuperUser</strong>, <strong>User</strong></li>
              <li>Go to <strong>"Users"</strong> tab</li>
              <li>Select your user: <strong>{authUser?.username}</strong></li>
              <li>Click <strong>"Add user to group"</strong></li>
              <li>Assign to any group</li>
              <li>Come back and click <strong>"Refresh JWT Payload"</strong></li>
            </ol>
            <p>
              <strong>User Pool ID:</strong> <code>{outputs.auth.user_pool_id}</code><br/>
              <strong>Region:</strong> <code>us-east-1</code><br/>
              <strong>Console Link:</strong> <a 
                href={`https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/${outputs.auth.user_pool_id}/users`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open Cognito Console
              </a>
            </p>
          </div>

          {typeIssueDemo && (
            <div className="type-issue">
              <h3>🚨 TypeScript Type Issue</h3>
              <pre>{typeIssueDemo}</pre>
            </div>
          )}

          <h3>Raw JWT Token (from Cognito)</h3>
          <div className="jwt-payload">
            <p style={{ wordBreak: 'break-all', fontSize: '12px' }}>
              {rawJwtToken || 'No token available'}
            </p>
          </div>

          {decodedRawPayload && (
            <div>
              <h3>Manually Decoded Raw JWT Payload</h3>
              <div className="jwt-payload">
                {JSON.stringify(decodedRawPayload, null, 2)}
              </div>
              
              <div className="success">
                <h4>✅ Proof: cognito:groups exists in raw JWT</h4>
                <p>
                  The raw JWT token from Cognito contains: <br/>
                  <code>cognito:groups: {JSON.stringify(decodedRawPayload['cognito:groups'] || 'Not assigned to any groups yet')}</code>
                </p>
                <p>
                  This proves the data exists in the actual token, but Amplify's TypeScript 
                  types don't include it!
                </p>
              </div>
            </div>
          )}

          {jwtPayload && (
            <div>
              <h3>JWT ID Token Payload (Amplify Typed)</h3>
              <div className="jwt-payload">
                {JSON.stringify(jwtPayload, null, 2)}
              </div>
              
              <h4>Accessing cognito:groups with proper typing:</h4>
              <div className="jwt-payload">
                {(() => {
                  const payloadWithGroups = jwtPayload as JwtPayloadWithGroups
                  return `Groups: ${JSON.stringify(payloadWithGroups['cognito:groups'] || 'No groups assigned')}`
                })()}
              </div>
            </div>
          )}

          {user && (
            <div>
              <h3>Current User Info</h3>
              <div className="jwt-payload">
                {JSON.stringify(user, null, 2)}
              </div>
            </div>
          )}

          <div className="error">
            <h3>📝 Issue Summary</h3>
            <p>
              The JWT payload contains <code>cognito:groups</code> at runtime, but TypeScript 
              doesn't recognize this property in the <code>JwtPayload</code> type definition.
            </p>
            <p>
              <strong>Expected:</strong> <code>JwtPayload</code> should include optional 
              <code>'cognito:groups'?: string[]</code> and <code>scope?: string</code> properties.
            </p>
          </div>
        </div>
      )}
    </Authenticator>
  )
}

export default App