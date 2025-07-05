import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { 
  Ambulance, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  MessageSquare,
  Navigation,
  User,
  Phone
} from "lucide-react";

export default function AmbulanceDashboard() {
  const { location } = useGeolocation();
  const { sendMessage } = useWebSocket();
  const [chatMessage, setChatMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: emergencyRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });

  const { data: communications } = useQuery({
    queryKey: ['/api/communications', selectedRequest?.id],
    enabled: !!selectedRequest,
    refetchInterval: 2000,
  });

  // Update location periodically
  useEffect(() => {
    if (location) {
      sendMessage({
        type: 'location_update',
        lat: location.latitude,
        lng: location.longitude
      });
    }
  }, [location, sendMessage]);

  const handleAcceptRequest = (request: any) => {
    setSelectedRequest(request);
    // Update request status
    fetch(`/api/emergency/request/${request.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        status: 'dispatched',
        ambulanceId: 1 // Should be actual ambulance ID
      })
    });
  };

  const handleSendMessage = () => {
    if (chatMessage.trim() && selectedRequest) {
      sendMessage({
        type: 'chat_message',
        emergencyRequestId: selectedRequest.id,
        receiverId: selectedRequest.hospitalId,
        receiverRole: 'hospital',
        message: chatMessage
      });
      setChatMessage("");
    }
  };

  const pendingRequests = emergencyRequests?.filter((req: any) => 
    req.status === 'pending' || req.status === 'dispatched'
  ) || [];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Status Header */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <div className="font-semibold text-gray-800">Ambulance Unit A-204</div>
                <div className="text-sm text-gray-600">Status: Available</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pendingRequests.length}
                </div>
                <div className="text-sm text-gray-600">Active Calls</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">12</div>
                <div className="text-sm text-gray-600">Completed Today</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Incoming Emergency Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-24 h-4 bg-gray-300 rounded"></div>
                      <div className="w-16 h-4 bg-gray-300 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-32 h-3 bg-gray-300 rounded"></div>
                      <div className="w-24 h-3 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map((request: any) => (
                  <div key={request.id} className={`border-l-4 p-4 rounded-lg ${
                    request.priority === 'critical' ? 'border-red-500 bg-red-50' :
                    request.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                    'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-2 ${
                          request.priority === 'critical' ? 'text-red-500' :
                          request.priority === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                        <span className={`font-semibold ${
                          request.priority === 'critical' ? 'text-red-700' :
                          request.priority === 'high' ? 'text-orange-700' :
                          'text-yellow-700'
                        }`}>
                          {request.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(request.requestedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">Patient: Anonymous</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          {request.address || 'Location coordinates available'}
                        </span>
                      </div>
                      {request.patientCondition && (
                        <div className="text-sm text-gray-700">
                          Condition: {request.patientCondition}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleAcceptRequest(request)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={request.status === 'dispatched'}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {request.status === 'dispatched' ? 'Dispatched' : 'Accept'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        disabled={request.status === 'dispatched'}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        View Route
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Ambulance className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No active emergency requests</p>
                <p className="text-sm">Standing by for emergencies</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route & Communication */}
        <div className="space-y-6">
          {/* Route Information */}
          <Card>
            <CardHeader>
              <CardTitle>Route & Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-gray-600">Google Maps Integration</div>
                  <div className="text-sm text-gray-500">Real-time route optimization</div>
                </div>
              </div>
              
              {selectedRequest && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <Navigation className="w-5 h-5 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-800">Patient Location</div>
                        <div className="text-sm text-gray-600">
                          {selectedRequest.address || 'GPS coordinates'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-green-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-800">Destination</div>
                        <div className="text-sm text-gray-600">Nearest Available Hospital</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600">ETA: 8 min</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication */}
          {selectedRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Hospital Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto mb-4">
                  {communications && communications.length > 0 ? (
                    <div className="space-y-3">
                      {communications.map((msg: any) => (
                        <div key={msg.id} className="flex items-start">
                          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                            {msg.senderId === 'hospital' ? '🏥' : '🚑'}
                          </div>
                          <div className="flex-1">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                              <div className="text-sm text-gray-600">{msg.message}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!chatMessage.trim()}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
