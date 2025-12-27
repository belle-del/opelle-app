export type InviteRecord = {
  token: string;
  clientDisplay: {
    firstName: string;
    lastName?: string;
    pronouns?: string;
  };
  stylistDisplay: {
    displayName: string;
    salonName?: string;
  };
};

export const lookupInvite = (token: string): InviteRecord | null => {
  if (!token.trim()) return null;
  return {
    token,
    clientDisplay: {
      firstName: "Client",
      lastName: token.slice(0, 4).toUpperCase(),
    },
    stylistDisplay: {
      displayName: "Belle",
    },
  };
};
