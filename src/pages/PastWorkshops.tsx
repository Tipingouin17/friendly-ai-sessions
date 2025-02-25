
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const PastWorkshops = () => {
  const workshops = [
    {
      id: 1,
      title: "Team Building Workshop",
      date: "2024-03-15",
      participants: 12,
      duration: "2 hours",
      facilitator: "Serious Game Master",
    },
    {
      id: 2,
      title: "Leadership Development",
      date: "2024-03-10",
      participants: 8,
      duration: "1.5 hours",
      facilitator: "Serious Game Master",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Past Workshops</h1>

        <div className="space-y-4">
          {workshops.map((workshop) => (
            <Card key={workshop.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{workshop.title}</h2>
                  <div className="flex items-center text-gray-600 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(workshop.date).toLocaleDateString()}
                  </div>
                  <p className="text-gray-600">Facilitator: {workshop.facilitator}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">{workshop.participants} participants</p>
                  <p className="text-gray-600">{workshop.duration}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PastWorkshops;
