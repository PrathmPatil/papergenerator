"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useUser } from "@/lib/user-context";
import { RECENT_PAPERS } from "@/lib/mock-data";
import { dateConverterUTC } from "@/hooks/common";
import { toast } from "@/hooks/use-toast";

import {
  FileText,
  Users,
  BookOpen,
  ArrowUpRight,
  Download,
  Plus,
} from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchAllPapersApi } from "@/utils/apis";
import { FullScreenLoading } from "@/components/loading";

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [papers, setPapers] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const handlePaperClick = (paperId: string) => {
    router.push(`/dashboard/papers/${paperId}`);
  };

  useEffect(() => {
    if (!user) return;

    const fetchPapers = async () => {
      try {
        const query = { isRecent: true };

        const res = await fetchAllPapersApi(query);

        const { success, papers, message, count } = res;
        console.log(res)

        if (success) {
          setPapers(papers || []);
          setCount(count);
          toast({
            title: "Success",
            description: message,
          });
        }
      } catch (error) {
        console.error("Failed to fetch papers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [user]);

  if (!user || loading) {
    return <FullScreenLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user.name}. Here's what's happening today.
          </p>
        </div>

        {user.role !== "student" && (
          <Link href="/dashboard/generate">
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              New Paper
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      {user.role !== "student" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Papers Generated" value={String(count)} icon={FileText} />
          {/* <StatCard title="Active Questions" value="45,231" icon={BookOpen} />
          <StatCard title="Active Users" value="573" icon={Users} />
          <StatCard title="Downloads" value="12.5k" icon={Download} /> */}
        </div>
      )}

      {/* Main Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Papers */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Papers</CardTitle>
            <CardDescription>
              You have generated {Number(papers.length || 0)} papers this week.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-8">
              {papers.length <= 0 ? <p>No recent papers found.</p>: papers.map((paper) => (
                <div key={paper._id} className="flex items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>

                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {paper.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generated on {dateConverterUTC(paper.createdAt)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => handlePaperClick(paper._id)}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for {user.role}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start bg-transparent hover:bg-transparent cursor-pointer"
              onClick={() => router.push("/dashboard/questions/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>

            {user.role !== "student" && (
              <Button
                variant="outline"
                className="justify-start bg-transparent hover:bg-transparent cursor-pointer"
                onClick={() => router.push("/dashboard/users")}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------- */
/* Reusable Stat Card   */
/* -------------------- */

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
