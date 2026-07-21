import React, { createContext, useContext, ReactNode } from "react";

interface BDTicketContextType {
  role: string;
  /** URL base da API gerada pelo motor (ex.: "https://api.exemplo.com"). Vazio = mesma origem. */
  apiBaseUrl: string;
  /** Retorna o JWT atual para anexar como Authorization: Bearer <token> nas chamadas geradas. */
  getAuthToken: () => string | null;
}

const BDTicketContext = createContext<BDTicketContextType | undefined>(undefined);

interface BDTicketProviderProps {
  role: string;
  apiBaseUrl?: string;
  getAuthToken?: () => string | null;
  children: ReactNode;
}

/**
 * Provider global para fornecer o perfil/role de privilégios, a URL base da API e o token de
 * autenticação ativos para os formulários e componentes headless (ex.: RelationSelect).
 */
export const BDTicketProvider: React.FC<BDTicketProviderProps> = ({
  role,
  apiBaseUrl = "",
  getAuthToken = () => null,
  children
}) => {
  return (
    <BDTicketContext.Provider value={{ role, apiBaseUrl, getAuthToken }}>
      {children}
    </BDTicketContext.Provider>
  );
};

/**
 * Hook de uso do contexto do BD-Ticket.
 */
export const useBDTicket = (): BDTicketContextType => {
  const context = useContext(BDTicketContext);
  // Retorna fallback se não estiver envelopado em um Provider
  return context || { role: "user", apiBaseUrl: "", getAuthToken: () => null };
};
