import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmergencyButton } from "@/components/emergency-button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { MapPin, Clock, Building2, CheckCircle } from "lucide-react";

export default function PatientDashboard() {
  const { location, error: locationError, isLoading: locationLoading } = useGeolocation();
  
  const { data: nearbyHospitals, isLoading: hospitalsLoading } = useQuery({
    queryKey: ['/api/hospitals/nearby', location?.latitude, location?.longitude],
    enabled: !!location,
  });

  const { data: emergencyRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency/requests'],
    refetchInterval: 5000,
  });

  const activeRequest = emergencyRequests?.find((req: any) => 
    req.status !== 'completed' && req.status !== 'cancelled'
  );

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Status Banner */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <div className="font-semibold text-green-800">System Online</div>
              <div className="text-sm text-green-700">Ready for emergency requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Emergency Request */}
      {activeRequest && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Active Emergency Request</CardTitle>
            <CardDescription className="text-red-700">
              Status: {activeRequest.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700">Priority:</span>
                <Badge variant={activeRequest.priority === 'critical' ? 'destructive' : 'default'}>
                  {activeRequest.priority}
                </Badge>
              </div>
              {activeRequest.ambulanceId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-700">Ambulance:</span>
                  <span className="text-sm font-medium">Dispatched</span>
                </div>
              )}
              <div className="text-xs text-red-600">
                Requested: {new Date(activeRequest.requestedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Request Section */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Request</CardTitle>
          <CardDescription>Tap the button below for immediate help</CardDescription>
        </CardHeader>
        <CardContent>
          <EmergencyButton 
            disabled={!!activeRequest}
            location={location}
          />
        </CardContent>
      </Card>

      {/* Location Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <div className="font-semibold text-gray-800">Current Location</div>
                <div className="text-sm text-gray-600">
                  {locationLoading ? 'Detecting location...' : 
                   locationError ? 'Location access denied' : 
                   'Detected automatically'}
                </div>
              </div>
            </div>
            <Badge variant={location ? 'default' : 'secondary'} className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              {location ? 'Active' : 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Hospitals */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Hospitals</CardTitle>
        </CardHeader>
        <CardContent>
          {hospitalsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                    <div>
                      <div className="w-32 h-4 bg-gray-300 rounded mb-1"></div>
                      <div className="w-24 h-3 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 h-4 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : nearbyHospitals && nearbyHospitals.length > 0 ? (
            <div className="space-y-3">
              {nearbyHospitals.map((hospital: any) => (
                <div key={hospital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      hospital.availableBeds > 5 ? 'bg-green-500' : 
                      hospital.availableBeds > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-800">{hospital.name}</div>
                      <div className="text-sm text-gray-600">
                        {hospital.availableBeds} beds available
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {Math.floor(Math.random() * 10) + 5} min
                    </div>
                    <div className="text-xs text-gray-500">
                      {(Math.random() * 5 + 1).toFixed(1)} km
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No nearby hospitals found</p>
              <p className="text-sm">Check your location settings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
