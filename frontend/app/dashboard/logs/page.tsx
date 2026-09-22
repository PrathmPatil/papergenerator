"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { fetchActivityLogsApi } from "@/utils/apis";

type ActivityLog = {
  _id: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  success?: boolean;
  ip?: string;
  createdAt?: string;
};

export default function ActivityLogsPage() {
  const { user } = useUser();
  const router = useRouter();
  const role = String(user?.role || "").toLowerCase();
  const allowed = role === "master" || role === "administrative";

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !allowed) router.replace("/dashboard");
  }, [user, allowed, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(q.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const res = await fetchActivityLogsApi({ page, limit: 50, q: search });
      if (cancelled) return;
      if (res?.success) {
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotal(Number(res.total) || 0);
        setTotalPages(Number(res.totalPages) || 1);
      } else {
        setRows([]);
      }
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [allowed, page, search]);

  if (!allowed) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold leading-tight">Activity Logs</h2>
          <p className="text-xs text-muted-foreground">{total} events stored in the database</p>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="Search email, IP, path, action..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading logs...</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-center text-sm">No logs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {row.userName ||
                            (row as any).userId?.name ||
                            row.userEmail ||
                            (row as any).userId?.email ||
                            "—"}
                        </div>
                        <div className="text-muted-foreground">
                          {row.userEmail || (row as any).userId?.email || ""}
                          {row.userRole || (row as any).userId?.role
                            ? ` · ${row.userRole || (row as any).userId?.role}`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.ip || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{row.action}</div>
                        <div className="text-muted-foreground">{row.path}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.success ? "secondary" : "destructive"}>
                          {row.statusCode || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-end gap-1 border-t px-2 py-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 text-xs">
              {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
