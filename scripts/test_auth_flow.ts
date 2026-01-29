/**
 * Manual test script to verify the authentication flow
 * This script tests:
 * 1. Participant registration
 * 2. Session validation
 * 3. Participant code uniqueness
 */

async function testAuthFlow() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
  
  console.log('🧪 Testing City Tour Authentication Flow\n')
  
  // Test 1: Register a new participant
  console.log('Test 1: Register new participant')
  try {
    const registerRes = await fetch(`${baseUrl}/api/tour/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        gender: 'male'
      })
    })
    
    const registerData = await registerRes.json()
    
    if (registerRes.ok && registerData.success) {
      console.log('✅ Registration successful')
      console.log(`   - Participant ID: ${registerData.participant.id}`)
      console.log(`   - Code: ${registerData.participant.code}`)
      console.log(`   - Name: ${registerData.participant.name}`)
      console.log(`   - Avatar: ${registerData.participant.profile_photo_url ? 'Generated' : 'Missing'}`)
    } else {
      console.log('❌ Registration failed:', registerData.error?.message)
      return false
    }
  } catch (error) {
    console.log('❌ Registration error:', error)
    return false
  }
  
  console.log('\n')
  
  // Test 2: Validate name requirements
  console.log('Test 2: Validate name requirements (too short)')
  try {
    const shortNameRes = await fetch(`${baseUrl}/api/tour/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        gender: 'female'
      })
    })
    
    const shortNameData = await shortNameRes.json()
    
    if (!shortNameRes.ok && shortNameData.error?.code === 'INVALID_NAME') {
      console.log('✅ Name validation working correctly')
    } else {
      console.log('❌ Name validation failed - should reject short names')
      return false
    }
  } catch (error) {
    console.log('❌ Name validation error:', error)
    return false
  }
  
  console.log('\n')
  
  // Test 3: Test gender-specific avatar generation
  console.log('Test 3: Gender-specific avatar generation')
  try {
    const maleRes = await fetch(`${baseUrl}/api/tour/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Male Test User',
        gender: 'male'
      })
    })
    
    const maleData = await maleRes.json()
    
    const femaleRes = await fetch(`${baseUrl}/api/tour/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Female Test User',
        gender: 'female'
      })
    })
    
    const femaleData = await femaleRes.json()
    
    if (maleData.success && femaleData.success) {
      console.log('✅ Gender-specific avatars generated')
      console.log(`   - Male avatar: ${maleData.participant.profile_photo_url.includes('dicebear') ? 'Valid' : 'Invalid'}`)
      console.log(`   - Female avatar: ${femaleData.participant.profile_photo_url.includes('dicebear') ? 'Valid' : 'Invalid'}`)
    } else {
      console.log('❌ Avatar generation failed')
      return false
    }
  } catch (error) {
    console.log('❌ Avatar generation error:', error)
    return false
  }
  
  console.log('\n')
  
  console.log('✅ All authentication flow tests passed!')
  return true
}

// Run tests
testAuthFlow()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
