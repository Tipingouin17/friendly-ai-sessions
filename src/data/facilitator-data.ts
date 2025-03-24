import { Facilitator, Workshop } from "../types/facilitator";

export const facilitators: Facilitator[] = [
  {
    id: 1,
    title: "Team-building Facilitator",
    profile_picture: "/lovable-uploads/fd3ef4cf-16d2-4ba3-8378-899a48eec819.png",
    details: "Enhances team cohesion, communication, and collaboration.",
    order: 1
  },
  {
    id: 2,
    title: "Innovation Coach",
    profile_picture: "/lovable-uploads/de181afa-d8f4-4e8f-81a8-ba647a23df4e.png",
    details: "Guides teams through creative problem-solving and innovation processes.",
    order: 2
  },
  {
    id: 3,
    title: "Leadership Expert",
    profile_picture: "/lovable-uploads/de181afa-d8f4-4e8f-81a8-ba647a23df4e.png",
    details: "Develops leadership skills and strategic thinking capabilities.",
    order: 3
  },
  {
    id: 4,
    title: "Agile Coach",
    profile_picture: "/lovable-uploads/de181afa-d8f4-4e8f-81a8-ba647a23df4e.png",
    details: "Facilitates agile ceremonies and coaches teams in agile practices.",
    order: 4
  },
  {
    id: 5,
    title: "Strategy Guide",
    profile_picture: "/lovable-uploads/de181afa-d8f4-4e8f-81a8-ba647a23df4e.png",
    details: "Helps teams develop and execute strategic initiatives.",
    order: 5
  },
  {
    id: 6,
    title: "Cultural Navigator",
    profile_picture: "/lovable-uploads/de181afa-d8f4-4e8f-81a8-ba647a23df4e.png",
    details: "Guides teams through cross-cultural collaboration and understanding.",
    order: 6
  }
];

export const workshops: Workshop[] = [
  {
    id: 1,
    title: "Mission Cohesion",
    scope: "Team dynamics and collaboration workshop",
    objective: "Enhance communication and team synergy through interactive exercises",
    icon_type: "brain",
    status: true
  },
  {
    id: 2,
    title: "Innovation Sprint",
    scope: "Creative problem-solving workshop",
    objective: "Generate and develop innovative solutions to challenges",
    icon_type: "puzzle",
    status: true
  },
  {
    id: 3,
    title: "Leadership Lab",
    scope: "Leadership development workshop",
    objective: "Develop essential leadership skills through practical scenarios",
    icon_type: "graduation-cap",
    status: true
  },
  {
    id: 4,
    title: "Agile Excellence",
    scope: "Agile methodology workshop",
    objective: "Master agile principles and practices through hands-on experience",
    icon_type: "book-open",
    status: true
  },
  {
    id: 5,
    title: "Strategy Summit",
    scope: "Strategic planning workshop",
    objective: "Develop and align on strategic initiatives and goals",
    icon_type: "microscope",
    status: true
  },
  {
    id: 6,
    title: "Cultural Bridge",
    scope: "Cross-cultural communication workshop",
    objective: "Build understanding and effectiveness across cultural differences",
    icon_type: "book-open",
    status: true
  }
];
