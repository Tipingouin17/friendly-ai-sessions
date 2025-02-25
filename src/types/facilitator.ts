
export type Step = 1 | 2 | 3;

export interface Facilitator {
  id: number;
  name: string;
  avatar: string;
  description: string;
}

export interface Workshop {
  id: number;
  title: string;
  icon: string;
  scope: string;
  objective: string;
}
