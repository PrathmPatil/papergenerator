"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Eye,
  Edit,
  Trash,
  MoreHorizontal,
  X,
  Copy,
  FileText,
  Search,
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { fetchAllPapersApi, deletePaperApi, clonePaperApi } from "@/utils/apis";
import { IconSpinner, LoadingPanel } from "@/components/loading";

import { CLASSES, getClassNameById } from "@/lib/data";
import { debounce } from "@/hooks/common";
import { showDeleteConfirm, showInfo } from "@/components/app-dialog-provider";

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
  const [cloningId, setCloningId] = useState<string | null>(null);
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
      console.log(res);
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

  const handleDelete = async (paper: IPaper) => {
    const confirmed = await showDeleteConfirm({
      title: "Delete paper?",
      itemName: paper.title,
      description: `Delete paper "${paper.title}"? This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await deletePaperApi(paper._id);
      setPapers((prev) => prev.filter((p) => p._id !== paper._id));
      showInfo({
        title: "Paper deleted",
        description: `"${paper.title}" was removed.`,
      });
    } catch (e) {
      console.error(e);
      showInfo({
        title: "Delete failed",
        description: "Failed to delete paper. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClone = async (paper: IPaper) => {
    if (cloningId) return;

    setCloningId(paper._id);
    try {
      const res: any = await clonePaperApi(paper._id);
      if (!res?.success || !res?.paper) {
        throw new Error(res?.message || res?.error || "Clone failed");
      }

      showInfo({
        title: "Paper cloned",
        description: `Created "${res.paper.title}"`,
      });
      await fetchPapers();
    } catch (e) {
      console.error(e);
      showInfo({
        title: "Clone failed",
        description: "Failed to clone paper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCloningId(null);
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
    <TooltipProvider>
    <div className="space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight">Paper Bank</h2>
          <p className="text-xs text-muted-foreground">{stats.totalPapers} papers</p>
        </div>
        <IconAction label="Create Paper">
          <Button asChild size="icon-sm">
            <Link href="/dashboard/generate" aria-label="Create Paper">
              <Plus />
            </Link>
          </Button>
        </IconAction>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="flex items-center gap-1 p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="Search paper title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="h-8 w-[9.5rem] shrink-0">
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
          <IconAction label="Clear filters">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear filters"
              onClick={clearFilters}
            >
              <X />
            </Button>
          </IconAction>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingPanel label="Loading papers..." icon={FileText} />
          ) : papers.length === 0 ? (
            <div className="p-3 text-center text-sm">No papers found</div>
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
                {papers.length > 0 ? papers?.map((paper) => (
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
                          <Button size="icon-sm" variant="ghost" disabled={cloningId === paper._id}>
                            <IconSpinner
                              icon={MoreHorizontal}
                              spinning={cloningId === paper._id}
                              className="mr-0"
                            />
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
                          <DropdownMenuItem
                            disabled={cloningId === paper._id}
                            onClick={() => void handleClone(paper)}
                          >
                            <IconSpinner
                              icon={Copy}
                              spinning={cloningId === paper._id}
                              className="mr-2"
                            />
                            {cloningId === paper._id ? "Cloning..." : "Clone"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            variant="destructive"
                            onClick={() => void handleDelete(paper)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No papers found
                    </TableCell>
                  </TableRow>
                )}
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
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <p>Class: {getClassNameById(selectedPaper.classId)}</p>
                <p>Total Marks: {selectedPaper.totalMarks}</p>
                <p>Duration: {selectedPaper.durationMinutes} min</p>
                <p>Sections: {selectedPaper.sections.length}</p>
              </div>

              {selectedPaper.sections.map((sec) => (
                <Card key={sec.id} className="gap-0 py-0">
                  <CardContent className="flex justify-between p-2">
                    <span>{sec.name}</span>
                    <Badge>{sec.marks} marks</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}

function IconAction({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
