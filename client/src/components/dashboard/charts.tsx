import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SalesChartData {
  date: string;
  amount: number;
}

interface TopProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
}

export default function Charts() {
  const { formatCurrency } = useSettings();
  const { 
    dateRangeType, 
    startDate, 
    endDate, 
    isCustomRange,
    getTimezoneAwareDates
  } = useDateRange();

  const buildSalesChartUrl = () => {
    const params = new URLSearchParams();
    params.append('dateRangeType', dateRangeType);
    
    // Use timezone-aware dates
    const { startDate: tzStartDate, endDate: tzEndDate } = getTimezoneAwareDates();
    params.append('startDate', tzStartDate);
    params.append('endDate', tzEndDate);
    
    return `/api/dashboard/sales-chart?${params.toString()}`;
  };

  const buildTopProductsUrl = () => {
    const params = new URLSearchParams();
    params.append('dateRangeType', dateRangeType);
    
    // Use timezone-aware dates  
    const { startDate: tzStartDate, endDate: tzEndDate } = getTimezoneAwareDates();
    params.append('startDate', tzStartDate);
    params.append('endDate', tzEndDate);
    
    return `/api/dashboard/top-products?${params.toString()}`;
  };

  const { data: salesData = [], isLoading } = useQuery<SalesChartData[]>({
    queryKey: [buildSalesChartUrl(), dateRangeType, startDate, endDate],
  });

  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery<TopProduct[]>({
    queryKey: [buildTopProductsUrl(), dateRangeType, startDate, endDate],
  });

  // Sales chart configuration
  const salesChartData = {
    labels: salesData.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: "Ventas ($)",
        data: salesData.map(item => item.amount),
        borderColor: "hsl(207, 90%, 54%)",
        backgroundColor: "hsla(207, 90%, 54%, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "#f0f0f0",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Real data for products chart from top 10 API
  const productsChartData = {
    labels: topProducts.length > 0 
      ? topProducts.slice(0, 5).map(p => p.productName)
      : ["Sin datos"],
    datasets: [
      {
        data: topProducts.length > 0 
          ? topProducts.slice(0, 5).map(p => p.totalQuantity)
          : [1],
        backgroundColor: [
          "hsl(207, 90%, 54%)",
          "hsl(142, 76%, 36%)",
          "hsl(38, 92%, 50%)",
          "hsl(0, 84%, 60%)",
          "hsl(271, 76%, 53%)",
        ],
      },
    ],
  };

  const productsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  if (isLoading || topProductsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <div className="w-full h-full bg-gray-100 animate-pulse rounded"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <div className="w-full h-full bg-gray-100 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ventas Recientes</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <Line data={salesChartData} options={salesChartOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos Más Vendidos</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <Doughnut data={productsChartData} options={productsChartOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
