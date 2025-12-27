export type ClientPacketV1 = {
  version: 1;
  token: string;
  stylist: { displayName: string; salonName?: string };
  client: { firstName: string; lastName?: string; pronouns?: string };
  nextAppointment?: {
    startAt: string;
    serviceName: string;
    durationMin: number;
  };
  aftercare: {
    summary: string;
    do: string[];
    dont: string[];
    rebookWindowDays?: number;
  };
  lastFormulaSummary?: { title: string; notes?: string };
  updatedAt: string;
};
