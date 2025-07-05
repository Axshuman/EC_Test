import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RoleHeader } from '@/components/role-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, Bed, AlertCircle, Activity, Heart, Ambulance, Hospital, Navigation, Zap, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected } = useWebSocket();
  const { toast } = useToast();
  
  // State for emergency request dialog
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [optimisticRequests, setOptimisticRequests] = useState<any[]>([]);

  // Mock hospital data for demonstration
  const mockHospitals = [
    {
      id: 1,
      name: "City General Hospital",
      address: "123 Main St, Downtown",
      phone: "(555) 123-4567",
      totalBeds: 150,
      availableBeds: 23,
      icuBeds: 20,
      availableIcuBeds: 3,
      emergencyStatus: "available",
      distance: "1.2 km"
    },
    {
      id: 2,
      name: "Metro Emergency Center",
      address: "456 Oak Ave, Midtown",
      phone: "(555) 987-6543",
      totalBeds: 200,
      availableBeds: 45,
      icuBeds: 30,
      availableIcuBeds: 8,
      emergencyStatus: "available",
      distance: "2.1 km"
    },
    {
      id: 3,
      name: "Regional Medical Center",
      address: "789 Pine Rd, Uptown",
      phone: "(555) 456-7890",
      totalBeds: 300,
      availableBeds: 12,
      icuBeds: 40,
      availableIcuBeds: 2,
      emergencyStatus: "busy",
      distance: "3.5 km"
    },
    {
      id: 4,
      name: "University Hospital",
      address: "321 College Blvd, University District",
      phone: "(555) 654-3210",
      totalBeds: 180,
      availableBeds: 0,
      icuBeds: 25,
      availableIcuBeds: 0,
      emergencyStatus: "full",
      distance: "4.8 km"
    }
  ];

  // Fetch data with proper typing
  const { data: hospitals = mockHospitals, isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/hospitals'],
    initialData: mockHospitals,
  });

  const { data: emergencyRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['/api/emergency-requests/patient', user?.id],
    enabled: !!user?.id,
    refetchInterval: 3000, // Refresh every 3 seconds for faster updates
  });

  // Emergency request mutation
  const emergencyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/emergency/request', data);
      return response.json();
    },
    onSuccess: (newRequest) => {
      // Show attention-grabbing success notification
      toast({
        title: "🚨 EMERGENCY REQUEST SENT",
        description: "Help is on the way! Ambulances have been notified of your emergency.",
        duration: 8000,
        className: "toast-success"
      });
      
      // Show additional alert for critical emergencies
      if (emergencyType === 'Heart Attack' || emergencyType === 'Severe Injury') {
        setTimeout(() => {
          toast({
            title: "🚑 CRITICAL EMERGENCY DISPATCHED",
            description: "Priority ambulance en route to your location!",
            duration: 10000,
            className: "toast-emergency"
          });
        }, 2000);
      }
      
      setIsEmergencyDialogOpen(false);
      setEmergencyType('');
      setEmergencyDescription('');
      
      // Immediately refetch to show the new request
      refetchRequests();
      
      // Invalidate cache to force refresh
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-requests/patient', user?.id] });
    },
    onError: (error) => {
      toast({
        title: "❌ REQUEST FAILED",
        description: "Unable to send emergency request. Please try again immediately!",
        variant: "destructive",
        duration: 8000,
        className: "toast-emergency"
      });
    },
  });

  const handleEmergencyRequest = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location access to request emergency services.",
        variant: "destructive",
      });
      return;
    }

    // Create optimistic request for immediate display
    const optimisticRequest = {
      id: Date.now(), // Temporary ID
      patientId: user?.id,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      address: "Current location",
      patientCondition: emergencyType,
      notes: emergencyDescription,
      priority: emergencyType === 'Heart Attack' || emergencyType === 'Severe Injury' ? 'critical' : 
               emergencyType === 'Chest Pain' || emergencyType === 'Difficulty Breathing' ? 'high' : 'medium',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to optimistic requests immediately
    setOptimisticRequests(prev => [optimisticRequest, ...prev]);

    emergencyMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
      address: "Current location", // In real app, would reverse geocode
      patientCondition: emergencyType,
      notes: emergencyDescription,
      priority: optimisticRequest.priority
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'full': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'dispatched': return <Ambulance className="w-4 h-4" />;
      case 'en_route': return <Navigation className="w-4 h-4" />;
      case 'completed': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Emergency Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Immediate medical assistance at your fingertips
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>Location Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Action Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Emergency Button Card */}
          <Card className="lg:col-span-2 border-red-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Zap className="w-6 h-6" />
                Emergency Services
              </CardTitle>
              <CardDescription className="text-red-100">
                Get immediate medical assistance when you need it most
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {locationError ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">Location Access Required</p>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">{locationError}</p>
                </div>
              ) : location ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <p className="text-green-800 font-medium">Location Detected</p>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    <p className="text-blue-800 font-medium">Detecting Location...</p>
                  </div>
                </div>
              )}
              
              <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg"
                    disabled={!location || !isConnected}
                  >
                    <Heart className="w-6 h-6 mr-2" />
                    REQUEST EMERGENCY HELP
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Emergency Request Details
                    </DialogTitle>
                    <DialogDescription>
                      Please provide details about your emergency to help responders prepare.
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
                          <SelectItem value="Heart Attack">Heart Attack</SelectItem>
                          <SelectItem value="Severe Injury">Severe Injury</SelectItem>
                          <SelectItem value="Chest Pain">Chest Pain</SelectItem>
                          <SelectItem value="Difficulty Breathing">Difficulty Breathing</SelectItem>
                          <SelectItem value="Stroke Symptoms">Stroke Symptoms</SelectItem>
                          <SelectItem value="Severe Bleeding">Severe Bleeding</SelectItem>
                          <SelectItem value="Allergic Reaction">Allergic Reaction</SelectItem>
                          <SelectItem value="Other">Other Medical Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Additional Details</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe symptoms, location details, or other important information..."
                        value={emergencyDescription}
                        onChange={(e) => setEmergencyDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => setIsEmergencyDialogOpen(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEmergencyRequest}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={!emergencyType || emergencyMutation.isPending}
                      >
                        {emergencyMutation.isPending ? 'Sending...' : 'Send Request'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Hospital className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available Hospitals</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Array.isArray(hospitals) ? hospitals.filter((h: any) => h.emergencyStatus === 'available').length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Ambulance className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Requests</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Array.isArray(emergencyRequests) ? emergencyRequests.filter((r: any) => !['completed', 'cancelled'].includes(r.status)).length : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Emergency History */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Emergency Requests
              </CardTitle>
              <CardDescription>
                Track your emergency service requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                // Combine optimistic requests with actual requests, removing duplicates
                const allRequests = [...optimisticRequests, ...(Array.isArray(emergencyRequests) ? emergencyRequests : [])];
                const uniqueRequests = allRequests.filter((request, index, arr) => 
                  arr.findIndex(r => r.id === request.id) === index
                );
                
                if (uniqueRequests.length === 0) {
                  return (
                    <div className="p-6 text-center">
                      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No emergency requests yet</p>
                      <p className="text-sm text-gray-400">When you request help, it will appear here</p>
                    </div>
                  );
                }
                
                return (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {uniqueRequests.slice(0, 5).map((request: any) => (
                      <div key={request.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(request.status)}
                              <Badge 
                                variant="secondary" 
                                className={`${getPriorityColor(request.priority)} text-white text-xs`}
                              >
                                {request.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {request.status}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm text-gray-900 mb-1">
                              {request.patientCondition || 'Medical Emergency'}
                            </p>
                            <p className="text-xs text-gray-600 mb-1">{request.address}</p>
                            {request.notes && (
                              <p className="text-xs text-gray-500 mb-2">{request.notes}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.requestedAt), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Nearby Hospitals */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hospital className="w-5 h-5" />
                  Nearby Hospitals
                </div>
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  View Map
                </Button>
              </CardTitle>
              <CardDescription>
                Real-time hospital availability and capacity information
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {hospitalsLoading ? (
                <div className="divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-20" />
                        <div className="h-6 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {Array.isArray(hospitals) && hospitals.map((hospital: any) => (
                    <div key={hospital.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm text-gray-900">{hospital.name}</h3>
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(hospital.emergencyStatus)} text-white text-xs`}
                            >
                              {hospital.emergencyStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{hospital.address}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Phone className="w-3 h-3" />
                            {hospital.phone}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Bed className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-700">
                                {hospital.availableBeds}/{hospital.totalBeds} beds
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-500" />
                              <span className="text-gray-700">
                                {hospital.availableIcuBeds}/{hospital.icuBeds} ICU
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">{hospital.distance}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}