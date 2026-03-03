"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash,
  MoreHorizontal,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchAllPapersApi, deletePaperApi } from "@/utils/apis";

import { CLASSES, getClassNameById } from "@/lib/data";
import { debounce } from "@/hooks/common";

/* ================= TYPES ================= */

interface IPaperSection {
  id: string;
  name: string;
  marks: number;
  questions: string[];
}

interface IPaper {
  _id: string;
  title: string;
  classId: string;
  totalMarks: number;
  durationMinutes: number;
  sections: IPaperSection[];
  createdAt: Date;
}

/* ================= COMPONENT ================= */

export default function PaperBankPage() {
  const [papers, setPapers] = useState<IPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<IPaper | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchPapers();
  }, [searchDebounce, filterClass]);

  const fetchPapers = async () => {
    setIsLoading(true);

    const payload = {
      classId: filterClass !== "all" ? filterClass : undefined,
      title: searchDebounce || undefined,
      order: "desc",
    };

    try {
      const res = await fetchAllPapersApi(payload);
      setPapers(res?.success ? res.papers : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  /* ================= STATS ================= */

  const stats = useMemo(() => {
    return {
      totalPapers: papers.length,
      totalMarks: papers.reduce((sum, p) => sum + p.totalMarks, 0),
    };
  }, [papers]);

  /* ================= ACTIONS ================= */

  const handleView = (paper: IPaper) => {
    setSelectedPaper(paper);
    setViewModalOpen(true);
  };

  const confirmDelete = async () => {
  if (!deletingId) return;

  try {
    await deletePaperApi(deletingId); // ✅ backend soft delete

    // ✅ remove from UI after success
    setPapers((prev) => prev.filter((p) => p._id !== deletingId));
    setDeletingId(null);
  } catch (e) {
    console.error(e);
    alert("Failed to delete paper");
  }
};


  const clearFilters = () => {
    setSearchTerm("");
    setSearchDebounce("");
    setFilterClass("all");
  };

  const debouncedSearch = useMemo(
    () => debounce((v: string) => setSearchDebounce(v), 800),
    []
  );

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Paper Bank</h2>
          <p className="text-muted-foreground">
            Manage exam papers and sections
          </p>
        </div>
        <Link href="/dashboard/generate" className="cursor-pointer">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Paper
          </Button>
        </Link>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="Total Papers" value={stats.totalPapers} />
        <Card className="col-span-3">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="flex gap-2 items-center">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Input
              placeholder="Search paper title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {CLASSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : papers.length === 0 ? (
            <div className="p-6 text-center">No papers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {papers.map((paper) => (
                  <TableRow key={paper._id}>
                    <TableCell className="font-medium">{paper.title}</TableCell>
                    <TableCell>{getClassNameById(paper.classId)}</TableCell>
                    <TableCell>{paper.totalMarks}</TableCell>
                    <TableCell>{paper.durationMinutes} min</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paper.sections.length}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/papers/${paper._id}`}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/papers/edit/${paper._id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeletingId(paper._id)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter />
            </Table>
          )}
        </CardContent>
      </Card>

      {/* VIEW MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title}</DialogTitle>
          </DialogHeader>

          {selectedPaper && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 text-sm gap-2">
                <p>Class: {getClassNameById(selectedPaper.classId)}</p>
                <p>Total Marks: {selectedPaper.totalMarks}</p>
                <p>Duration: {selectedPaper.durationMinutes} min</p>
                <p>Sections: {selectedPaper.sections.length}</p>
              </div>

              {selectedPaper.sections.map((sec) => (
                <Card key={sec.id}>
                  <CardContent className="p-4 flex justify-between">
                    <span>{sec.name}</span>
                    <Badge>{sec.marks} marks</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Paper?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= STAT CARD ================= */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="col-span-1">
      <CardContent className="pt-6 text-center">
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
