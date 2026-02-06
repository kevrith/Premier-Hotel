import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Download, TrendingUp, Bed, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/Dashboard/ExportButton';
import axios from 'axios';

export function OccupancyReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/financial-statements/occupancy-report`,
        {
          params: { start_date: startDate, end_date: endDate },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching occupancy report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Occupancy & Room Performance Report
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Track room occupancy, RevPAR, and ADR metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="text-xs sm:text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input px-2 sm:px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs sm:text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input px-2 sm:px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={fetchReport} className="flex-1 sm:flex-none">Generate</Button>
              {data && (
                <ExportButton
                  title="Occupancy Report"
                  data={data.by_room_type}
                  columns={['room_type', 'total_rooms', 'bookings', 'revenue', 'avg_rate']}
                  filename={`occupancy_report_${startDate}_${endDate}.xlsx`}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data.summary.occupancy_rate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.occupied_nights} / {data.summary.total_room_nights} nights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              RevPAR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">KES {data.summary.revpar.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Revenue per available room</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ADR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">KES {data.summary.adr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Average daily rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Total Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data.summary.total_rooms}</div>
            <p className="text-xs text-muted-foreground mt-1">Available rooms</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Performance by Room Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Room Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">Total Rooms</TableHead>
                  <TableHead className="text-xs sm:text-sm">Bookings</TableHead>
                  <TableHead className="text-xs sm:text-sm">Revenue</TableHead>
                  <TableHead className="text-xs sm:text-sm">Avg Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.by_room_type.map((type: any) => (
                  <TableRow key={type.room_type}>
                    <TableCell className="font-medium text-xs sm:text-sm">{type.room_type}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{type.total_rooms}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{type.bookings}</TableCell>
                    <TableCell className="text-xs sm:text-sm">KES {type.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-xs sm:text-sm">KES {type.avg_rate.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
