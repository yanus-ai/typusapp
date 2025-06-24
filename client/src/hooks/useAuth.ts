import { useSelector, useDispatch } from 'react-redux';
import { login, register, googleLogin, logout } from '../features/auth/authSlice';
import { RootState, AppDispatch } from '../store';
import { LoginCredentials, RegisterData } from '../types/auth';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const loginUser = async (credentials: LoginCredentials) => {
    return dispatch(login(credentials)).unwrap();
  };

  const registerUser = async (userData: RegisterData) => {
    return dispatch(register(userData)).unwrap();
  };

  const loginWithGoogle = async (token: string) => {
    return dispatch(googleLogin(token)).unwrap();
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  return {
    ...auth,
    loginUser,
    registerUser,
    loginWithGoogle,
    logoutUser,
  };
};