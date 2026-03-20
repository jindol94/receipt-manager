'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp, signIn, TEAMS } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (mode === 'signup') {
      if (!team) {
        setError('팀을 선택해주세요.');
        setLoading(false);
        return;
      }
      const { data, error: signUpError } = await signUp(email, password, team);
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError('이미 가입된 이메일입니다.');
      } else {
        setSuccessMessage(
          '가입이 완료되었습니다. 이메일 확인 후 로그인해주세요.'
        );
        setMode('login');
        setPassword('');
      }
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      // Explicitly redirect after successful login
      router.push('/');
      router.refresh();
      return;
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">영수증 관리</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? '로그인' : '회원가입'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && (
          <div className="auth-success">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="team">
                소속 팀
              </label>
              <select
                id="team"
                className="form-select"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                required
              >
                <option value="">팀 선택</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading
              ? '처리 중...'
              : mode === 'login'
              ? '로그인'
              : '회원가입'}
          </button>
        </form>

        <div className="auth-toggle">
          <span className="auth-toggle-text">
            {mode === 'login'
              ? '계정이 없으신가요?'
              : '이미 계정이 있으신가요?'}
          </span>
          <button className="auth-toggle-btn" onClick={toggleMode} type="button">
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
