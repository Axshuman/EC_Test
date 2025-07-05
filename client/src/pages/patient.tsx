import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQuery } from '@tanstack/react-query';
import { EmergencyButton } from '@/components/emergency-button';
import { RoleHeader } from '@/components/role-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Phone, Bed, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { location, error: locationError } = useGeolocation();
  const { isConnected } = useWebSocket();
  const [activeTab, setActiveTab] = useState('emergency');

  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/hospitals'],
  });

  const { data: emergencyRequests = [] } = useQuery({
    queryKey: ['/api/emergency-requests/patient', user?.id],
    enabled: !!user?.id,
  });

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleHeader user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Dashboard</h1>
          <p className="text-gray-600">
            Emergency services at your fingertips
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="emergency" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Emergency Services
                  </CardTitle>
                  <CardDescription>
                    Press the button below to request immediate emergency assistance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {locationError && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">
                          <strong>Location Access:</strong> {locationError}
                        </p>
                      </div>
                    )}
                    
                    {location && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800 text-sm flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location detected: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                    
                    <EmergencyButton 
                      disabled={!location || !isConnected}
                      location={location}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hospitals" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Nearby Hospitals</h2>
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
              </div>
              
              {hospitalsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded w-20" />
                          <div className="h-6 bg-gray-200 rounded w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {hospitals.map((hospital: any) => (
                    <Card key={hospital.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{hospital.name}</h3>
                            <p className="text-gray-600 text-sm mb-2">{hospital.address}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                              <Phone className="w-4 h-4" />
                              {hospital.phone}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Bed className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  {hospital.availableBeds}/{hospital.totalBeds} beds
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Bed className="w-4 h-4 text-red-500" />
                                <span className="text-sm">
                                  {hospital.availableIcuBeds}/{hospital.icuBeds} ICU
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(hospital.emergencyStatus)} text-white`}
                            >
                              {hospital.emergencyStatus}
                            </Badge>
                            <span className="text-xs text-gray-500">2.3 km</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Emergency History</h2>
              
              {emergencyRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No emergency requests found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {emergencyRequests.map((request: any) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant="secondary" 
                                className={`${getPriorityColor(request.priority)} text-white`}
                              >
                                {request.priority}
                              </Badge>
                              <Badge variant="outline">
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.address}</p>
                            <p className="text-sm text-gray-500 mb-2">{request.patientCondition}</p>
                            {request.notes && (
                              <p className="text-sm text-gray-500 mb-2">{request.notes}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.requestedAt), 'PPpp')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}