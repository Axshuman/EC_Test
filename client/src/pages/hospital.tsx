import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BedManagement } from "@/components/bed-management";
import { AmbulanceTracking } from "@/components/ambulance-tracking";
import { HospitalCommunication } from "@/components/hospital-communication";
import { 
  Bed, 
  CheckCircle, 
  Ambulance, 
  AlertTriangle,
  Users,
  Activity,
  Clock,
  Heart
} from "lucide-react";

export default function HospitalDashboard() {
  const [selectedEmergencyStatus, setSelectedEmergencyStatus] = useState("busy");
  
  const { data: emergencyRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });

  const { data: hospitals } = useQuery({
    queryKey: ['/api/hospitals/available'],
  });

  // Mock data for demonstration
  const hospitalStats = {
    totalBeds: 24,
    availableBeds: 8,
    incomingAmbulances: 3,
    criticalPatients: 2,
  };

  const incomingAmbulances = emergencyRequests?.filter((req: any) => 
    req.status === 'en_route' || req.status === 'dispatched'
  ) || [];

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Hospital Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{hospitalStats.totalBeds}</div>
                <div className="text-sm text-gray-600">Total Beds</div>
              </div>
              <Bed className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{hospitalStats.availableBeds}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{hospitalStats.incomingAmbulances}</div>
                <div className="text-sm text-gray-600">Incoming</div>
              </div>
              <Ambulance className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{hospitalStats.criticalPatients}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bed Management */}
          <BedManagement />

          {/* Incoming Ambulances */}
          <Card>
            <CardHeader>
              <CardTitle>Incoming Ambulances</CardTitle>
            </CardHeader>
            <CardContent>
              {incomingAmbulances.length > 0 ? (
                <div className="space-y-4">
                  {incomingAmbulances.map((request: any) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 animate-pulse ${
                            request.priority === 'critical' ? 'bg-red-500' :
                            request.priority === 'high' ? 'bg-orange-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              Ambulance Unit #{request.ambulanceId || 'A-204'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {request.priority} Priority - {request.patientCondition || 'General Emergency'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.floor(Math.random() * 10) + 5} min
                          </div>
                          <div className="text-sm text-gray-600">ETA</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Patient: Anonymous</span>
                        <span>Distance: {(Math.random() * 5 + 1).toFixed(1)} km</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Ambulance className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No incoming ambulances</p>
                  <p className="text-sm">All emergency units available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* ER Status */}
          <Card>
            <CardHeader>
              <CardTitle>ER Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <Badge 
                    variant={selectedEmergencyStatus === 'available' ? 'default' : 
                            selectedEmergencyStatus === 'busy' ? 'secondary' : 'destructive'}
                    className={
                      selectedEmergencyStatus === 'available' ? 'bg-green-100 text-green-800' :
                      selectedEmergencyStatus === 'busy' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {selectedEmergencyStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Wait Time:</span>
                  <span className="font-semibold text-gray-800">15 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Staff on Duty:</span>
                  <span className="font-semibold text-gray-800">12</span>
                </div>
              </div>
              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const statuses = ['available', 'busy', 'full'];
                  const currentIndex = statuses.indexOf(selectedEmergencyStatus);
                  const nextIndex = (currentIndex + 1) % statuses.length;
                  setSelectedEmergencyStatus(statuses[nextIndex]);
                }}
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Resource Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Ventilators:</span>
                  <span className="font-semibold text-gray-800">8/12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Oxygen Tanks:</span>
                  <span className="font-semibold text-gray-800">24/30</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Defibrillators:</span>
                  <span className="font-semibold text-gray-800">6/8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Blood Bank:</span>
                  <Badge className="bg-green-100 text-green-800">Stocked</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Communication */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-800">Dr. Sarah Johnson</div>
                  <div className="text-sm text-gray-600">ICU bed 7 prepared for incoming patient</div>
                  <div className="text-xs text-gray-500 mt-1">2 min ago</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-800">Nurse Mike Chen</div>
                  <div className="text-sm text-gray-600">Room 204 ready for new patient</div>
                  <div className="text-xs text-gray-500 mt-1">5 min ago</div>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
