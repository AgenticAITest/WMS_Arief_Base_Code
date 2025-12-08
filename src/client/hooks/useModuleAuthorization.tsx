import { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '../provider/AuthProvider';

interface ModuleAuthorizationContextType {
  authorizedModules: string[];
  isModuleAuthorized: (moduleId: string) => boolean;
  checkingAuthorization: boolean;
  refreshAuthorizations: () => Promise<void>;
}

const ModuleAuthorizationContext = createContext<ModuleAuthorizationContextType | undefined>(undefined);

interface ModuleAuthorizationProviderProps {
  children: ReactNode;
}

export const ModuleAuthorizationProvider: React.FC<ModuleAuthorizationProviderProps> = ({ children }) => {
  const { token } = useAuth();
  const [authorizedModules, setAuthorizedModules] = useState<string[]>([]);
  const [checkingAuthorization, setCheckingAuthorization] = useState(true);

  const fetchAuthorizedModules = async () => {
    if (!token) {
      setAuthorizedModules([]);
      setCheckingAuthorization(false);
      return;
    }

    try {
      setCheckingAuthorization(true);
      const response = await axios.get('/api/system/module-authorization');
      const enabledModules = response.data.data
        .filter((auth: any) => auth.isEnabled)
        .map((auth: any) => auth.moduleId);
      setAuthorizedModules(enabledModules);
    } catch (error) {
      console.error('Error fetching authorized modules:', error);
      setAuthorizedModules([]);
    } finally {
      setCheckingAuthorization(false);
    }
  };

  useEffect(() => {
    fetchAuthorizedModules();
  }, [token]);

  const isModuleAuthorized = (moduleId: string): boolean => {
    return authorizedModules.includes(moduleId);
  };

  const refreshAuthorizations = async (): Promise<void> => {
    await fetchAuthorizedModules();
  };

  const contextValue: ModuleAuthorizationContextType = {
    authorizedModules,
    isModuleAuthorized,
    checkingAuthorization,
    refreshAuthorizations,
  };

  return (
    <ModuleAuthorizationContext.Provider value={contextValue}>
      {children}
    </ModuleAuthorizationContext.Provider>
  );
};

export const useModuleAuthorization = (): ModuleAuthorizationContextType => {
  const context = useContext(ModuleAuthorizationContext);
  if (context === undefined) {
    throw new Error('useModuleAuthorization must be used within a ModuleAuthorizationProvider');
  }
  return context;
};