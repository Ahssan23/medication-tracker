import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleReset = (e) => {
    e.preventDefault()
    alert('Password reset link sent! (For demo only)')
    navigate('/login')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <form onSubmit={handleReset}>
          <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Send Reset Link</button>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword