import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const handleCallback = async () => {
      const resolveRedirectPath = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return '/login';
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        return profile?.role === 'admin' ? '/admin' : '/';
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate(await resolveRedirectPath(), { replace: true });
        return;
      }

      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        setTimeout(async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();

          if (newSession) {
            navigate(await resolveRedirectPath(), { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }, 1000);
        return;
      }

      navigate('/login', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{t('Completing sign in...')}</p>
        <p className="text-xs text-gray-500 mt-2">{t('Please wait')}</p>
      </div>
    </div>
  );
}
