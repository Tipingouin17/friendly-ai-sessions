
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = 1 | 2 | 3;

interface Facilitator {
  id: number;
  name: string;
  avatar: string;
  description: string;
}

interface Workshop {
  id: number;
  title: string;
  icon: string;
  scope: string;
  objective: string;
}

const facilitators: Facilitator[] = [
  {
    id: 1,
    name: "Serious Game Master",
    avatar: "/lovable-uploads/fd3ef4cf-16d2-4ba3-8378-899a48eec819.png",
    description: "Facilitates activities that are designed to accomplish real-world objectives through the use of game elements. This facilitator specializes in guiding participants through scenarios that mimic real-life challenges, engaging them in a way that makes the learning experience fun yet impactful.",
  },
  // Add more facilitators as needed
];

const workshops: Workshop[] = [
  {
    id: 1,
    title: "Mission Cohesion: Solving Team Dynamics puzzles",
    icon: "🎯",
    scope: "an online interactive session designed to engage colleagues and improve teamwork dynamics in a challenging and enjoyable manner",
    objective: "to enhance communication skills, foster collaboration, promote problem-solving and decision-making capabilities, and boost overall team morale and unity",
  },
  // Add more workshops as needed
];

const MyFacilitators = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFacilitator, setSelectedFacilitator] = useState<number | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [agreed, setAgreed] = useState(false);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev === 1 ? 2 : 3) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev === 3 ? 2 : 1) as Step);
    }
  };

  const handleSubmit = () => {
    // Handle form submission
    console.log({
      facilitator: selectedFacilitator,
      workshop: selectedWorkshop,
      participantCount,
      description,
      language,
      agreed,
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">MyFacilitator</h1>
        <p className="text-lg text-muted-foreground text-center mb-4">
          Welcome to our Facilitator Page, where you can discover the power of AI-driven facilitation tailored to your specific needs.
        </p>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Unleash the full potential of MyFacilitator and enhance your sessions with intelligent guidance and support.
        </p>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {currentStep === 1 && <h2 className="text-2xl font-semibold mb-6">Select your Facilitator</h2>}
              {currentStep === 2 && <h2 className="text-2xl font-semibold mb-6">Select your Workshop</h2>}
              {currentStep === 3 && <h2 className="text-2xl font-semibold mb-6">Set your Workshop</h2>}
            </div>
            <div className="flex flex-col gap-4 items-end">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">1</div>
                <span>Choose your facilitator</span>
              </div>
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">2</div>
                <span>Select workshop type</span>
              </div>
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">3</div>
                <span>Describe participants</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            {currentStep === 1 && (
              <div className="grid grid-cols-2 gap-4">
                {facilitators.map((facilitator) => (
                  <div
                    key={facilitator.id}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedFacilitator === facilitator.id ? 'border-primary' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedFacilitator(facilitator.id)}
                  >
                    <img src={facilitator.avatar} alt={facilitator.name} className="w-24 h-24 rounded-full mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{facilitator.name}</h3>
                    <p className="text-sm text-gray-600">{facilitator.description}</p>
                  </div>
                ))}
                <div className="p-4 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary transition-all">
                  <div className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Add New Facilitator</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-2 gap-4">
                {workshops.map((workshop) => (
                  <div
                    key={workshop.id}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedWorkshop === workshop.id ? 'border-primary' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedWorkshop(workshop.id)}
                  >
                    <div className="text-4xl mb-4">{workshop.icon}</div>
                    <h3 className="text-lg font-semibold mb-2">{workshop.title}</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">Scope:</span>
                        <p className="text-sm text-gray-600">{workshop.scope}</p>
                      </div>
                      <div>
                        <span className="font-semibold">Objective:</span>
                        <p className="text-sm text-gray-600">{workshop.objective}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary transition-all">
                  <div className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Add New Workshop</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of participants</label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                    >
                      -
                    </Button>
                    <span className="text-xl font-semibold">{participantCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setParticipantCount(participantCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description of the participants</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your participants..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Facilitator's language</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                  <label htmlFor="terms" className="text-sm">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">
                      terms and conditions
                    </a>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
            ) : (
              <div></div>
            )}
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!agreed}>
                Let's Begin!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyFacilitators;
