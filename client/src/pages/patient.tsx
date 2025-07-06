import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, Bed, AlertCircle, Activity, Heart, Ambulance, Hospital, Navigation, Zap, Shield, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected, socket, lastMessage } = useWebSocket();
  
  // State for emergency request dialog
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Fetch real hospital data from Google Maps API
  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/maps/hospitals', location?.latitude, location?.longitude],
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: emergencyRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['/api/emergency/requests'],
    enabled: !!user?.id,
    refetchInterval: 5000, // Check every 5 seconds for real-time updates
  });

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    if (socket && lastMessage) {
      const { event, data } = lastMessage;
      
      switch (event) {
        case 'emergency_status_update':
          // Refetch emergency requests when status changes
          refetchRequests();
          break;
        case 'ambulance_response':
          // Handle ambulance accept/reject responses
          if (data.status === 'accepted') {
            // Show confirmation message
            setRequestSubmitted(false); // Reset loading state
          } else if (data.status === 'rejected') {
            // Show no ambulances available message
            setRequestSubmitted(false);
          }
          refetchRequests();
          break;
      }
    }
  }, [lastMessage, socket, refetchRequests]);

  // Emergency request mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/emergency/request', data);
      return response.json();
    },
    onSuccess: (newRequest) => {
      setRequestSubmitted(true);
      setIsEmergencyDialogOpen(false);
      setEmergencyType('');
      setEmergencyDescription('');
      
      // Invalidate and refetch to get the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/emergency/requests'] });
    },
    onError: (error) => {
      console.error('Emergency request failed:', error);
      alert('Unable to send emergency request. Please try again.');
    },
  });

  const handleEmergencyRequest = () => {
    if (!location) {
      alert('Location access is required for emergency requests.');
      return;
    }

    if (!emergencyType || !emergencyDescription) {
      alert('Please fill in all required fields.');
      return;
    }

    emergencyMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
      address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      patientCondition: emergencyType,
      notes: emergencyDescription,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for ambulance response...';
      case 'accepted': return 'Ambulance dispatched';
      case 'in_progress': return 'Ambulance en route';
      case 'completed': return 'Emergency completed';
      case 'rejected': return 'No ambulances available';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName || user?.username}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Emergency Button */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-6 h-6" />
            <span>Emergency Services</span>
          </CardTitle>
          <CardDescription>
            Request immediate medical assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={!location || emergencyMutation.isPending}
              >
                <AlertCircle className="w-5 h-5 mr-2" />
                Request Emergency Assistance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Emergency Request</DialogTitle>
                <DialogDescription>
                  Please provide details about your emergency
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergency-type">Emergency Type</Label>
                  <Select value={emergencyType} onValueChange={setEmergencyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emergency type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                      <SelectItem value="respiratory">Breathing Difficulty</SelectItem>
                      <SelectItem value="trauma">Injury/Trauma</SelectItem>
                      <SelectItem value="stroke">Stroke Symptoms</SelectItem>
                      <SelectItem value="other">Other Medical Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the emergency situation..."
                    value={emergencyDescription}
                    onChange={(e) => setEmergencyDescription(e.target.value)}
                    className="h-24"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEmergencyDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleEmergencyRequest}
                    disabled={emergencyMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {emergencyMutation.isPending ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {locationError && (
            <p className="text-sm text-red-600 mt-2">
              Location access required for emergency services
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current Emergency Requests */}
      {emergencyRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Current Emergency Requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {emergencyRequests.map((request: any) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusText(request.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{request.address}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Condition:</span> {request.patientCondition}
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span> {request.priority}
                  </div>
                </div>
                
                {request.notes && (
                  <div className="text-sm">
                    <span className="font-medium">Notes:</span> {request.notes}
                  </div>
                )}

                {request.status === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Ambulance Dispatched</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Emergency services are on their way to your location.
                    </p>
                  </div>
                )}

                {request.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">No Ambulances Available</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      All ambulances are currently busy. Please try again or contact emergency services directly.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nearby Hospitals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hospital className="w-5 h-5" />
            <span>Nearby Hospitals</span>
          </CardTitle>
          <CardDescription>
            Real-time hospital information within 30km radius
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hospitalsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading nearby hospitals...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {location ? 'No hospitals found in your area' : 'Enable location to see nearby hospitals'}
            </div>
          ) : (
            <div className="grid gap-4">
              {hospitals.slice(0, 5).map((hospital: any) => (
                <div key={hospital.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {hospital.address}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <div className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          <span>{hospital.availableBeds}/{hospital.totalBeds} beds</span>
                        </div>
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          <span>{hospital.availableIcuBeds}/{hospital.icuBeds} ICU</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={hospital.status === 'available' ? 'default' : 'secondary'}>
                        {hospital.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {hospital.distance} km
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}