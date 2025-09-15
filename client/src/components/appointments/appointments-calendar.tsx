import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AppointmentModal from "./appointment-modal";

interface Appointment {
  id: number;
  customerName: string;
  customerPhone: string;
  subject: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
}

export default function AppointmentsCalendar() {
  console.log("✅ AppointmentsCalendar component is rendering");
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  // Get appointments for current month
  const { data: appointments = [], isLoading, error } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  console.log("📅 Appointments data:", appointments, "Loading:", isLoading);
  
  // Debug: log appointment dates and current month
  const currentMonth = currentDate.getMonth() + 1; // 1-based month
  const currentYear = currentDate.getFullYear();
  console.log(`📅 Current calendar view: ${currentYear}-${String(currentMonth).padStart(2, '0')}`);
  
  appointments.forEach(apt => {
    const aptDateStr = apt.appointmentDate.split('T')[0];
    console.log(`📅 Appointment ${apt.customerName}: ${apt.appointmentDate} -> ${aptDateStr}`);
  });

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDateObj.getMonth() === month;
      // Use local date format to avoid timezone issues
      const year = currentDateObj.getFullYear();
      const month_num = String(currentDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(currentDateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month_num}-${day}`;
      
      // Find appointments for this date
      const dayAppointments = appointments.filter(apt => {
        const aptDate = apt.appointmentDate.split('T')[0];
        const match = aptDate === dateStr;
        if (match) {
          console.log(`🎯 Found appointment match: ${apt.customerName} on ${dateStr} (apt: ${aptDate})`);
        }
        return match;
      });
      
      if (dayAppointments.length > 0) {
        console.log(`📅 Day ${dateStr} has ${dayAppointments.length} appointments:`, dayAppointments.map(a => a.customerName));
      }
      
      days.push({
        date: new Date(currentDateObj),
        isCurrentMonth,
        appointments: dayAppointments
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Citas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Cargando calendario...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Function to get color classes based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
      case 'programada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendario de Citas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setSelectedDate(new Date());
                setShowModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Cita
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend for appointment status colors */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Estados de Citas:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span className="text-sm text-gray-600">Confirmadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                <span className="text-sm text-gray-600">Programadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span className="text-sm text-gray-600">Pendientes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                <span className="text-sm text-gray-600">Canceladas</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-gray-500 border-b"
              >
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border rounded cursor-pointer transition-colors
                  ${day.isCurrentMonth 
                    ? "bg-white hover:bg-blue-50 border-gray-200" 
                    : "bg-gray-50 text-gray-400 border-gray-100"
                  }
                  ${day.date.toDateString() === new Date().toDateString() 
                    ? "bg-blue-100 border-blue-300" 
                    : ""
                  }
                `}
                onClick={() => handleDateClick(day.date)}
              >
                <div className="text-sm font-medium mb-1">
                  {day.date.getDate()}
                </div>
                
                {day.appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`
                      text-xs p-2 mb-1 rounded-md shadow-sm border
                      ${getStatusColor(appointment.status)}
                      hover:shadow-md transition-shadow cursor-pointer
                    `}
                    title={`${appointment.customerName} - ${appointment.subject} (${appointment.status})`}
                  >
                    <div className="font-semibold truncate">{appointment.customerName}</div>
                    <div className="text-xs opacity-90 mt-0.5 truncate font-medium">{appointment.subject}</div>
                    <div className="text-xs opacity-80 mt-1">{appointment.appointmentTime}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <AppointmentModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowModal(false);
            setSelectedDate(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            setShowModal(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}