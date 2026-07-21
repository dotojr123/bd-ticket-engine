import React, { createContext, useContext, ReactNode } from "react";

interface BDTicketContextType {
  role: string;
}

const BDTicketContext = createContext<BDTicketContextType | undefined>(undefined);

interface BDTicketProviderProps {
  role: string;
  children: ReactNode;
}

/**
 * Provider global para fornecer o perfil/role de privilégios ativa para os formulários headless.
 */
export const BDTicketProvider: React.FC<BDTicketProviderProps> = ({ role, children }) => {
  return (
    <BDTicketContext.Provider value={{ role }}>
      {children}
    </BDTicketContext.Provider>
  );
};

/**
 * Hook de uso do contexto do BD-Ticket.
 */
export const useBDTicket = () => {
  const context = useContext(BDTicketContext);
  // Retorna fallback se não estiver envelopado em um Provider
  return context || { role: "user" };
};
