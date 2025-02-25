
interface ChatHeaderProps {
  title?: string;
  objective?: string;
  profilePicture?: string;
  participantCount?: number;
}

const ChatHeader = ({ 
  title, 
  objective, 
  profilePicture,
  participantCount = 1
}: ChatHeaderProps) => {
  return (
    <div className="border-b border-gray-100 p-6">
      <div className="flex items-center gap-4">
        <img
          src={profilePicture || "/placeholder.svg"}
          alt={title}
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-gray-600 text-sm">{objective}</p>
          <p className="text-sm text-primary mt-1">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
