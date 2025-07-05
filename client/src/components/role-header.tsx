import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { 
  Heart, 
  Bell, 
  LogOut, 
  User,
  Ambulance,
  Building2,
  UserCheck
} from "lucide-react";

interface RoleHeaderProps {
  user: any;
}

export function RoleHeader({ user }: RoleHeaderProps) {
  const { logout } = useAuth();
  const [notifications] = useState(3);

  const getRoleIcon = () => {
    switch (user.role) {
      case 'patient':
        return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'ambulance':
        return <Ambulance className="w-5 h-5 text-orange-600" />;
      case 'hospital':
        return <Building2 className="w-5 h-5 text-green-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'patient':
        return 'bg-blue-100 text-blue-800';
      case 'ambulance':
        return 'bg-orange-100 text-orange-800';
      case 'hospital':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-800">EmergencyConnect</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getRoleIcon()}
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-800">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-600">{user.email}</div>
                </div>
              </div>
              <Badge className={getRoleColor()}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
            
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-gray-600 hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
