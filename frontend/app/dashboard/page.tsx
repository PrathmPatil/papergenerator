"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/lib/user-context";
import { RECENT_PAPERS } from "@/lib/mock-data";
import {
  FileText,
  Users,
  BookOpen,
  ArrowUpRight,
  Download,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAllPapersApi, fetchQuestionsApi, helloApi } from "@/utils/apis";
import { toast } from "@/hooks/use-toast";
import { dateConverterUTC } from "@/hooks/common";

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [papers, setPapers] = useState<any[]>([]);
  if (!user) return null;

  const handlePaperClick = (paperId: string) => {
    router.push(`/dashboard/papers/${paperId}`);
  };

  useEffect(() => {
    async function fetchPapers() {
      try {
        
      let query = {isRecent:true};
      // {
      //   "classId": "class_8",
      //   "subjectId": "",
      //   "topicId": "",
      //   "type": "",
      //   "difficulty": ""
      // }

      // if (user.role === "student") {
      //   query = {
      //     classId: user.classId,
      //     subjectId: user.subjectId,
      //     topicId: user.topicId,
      //     type: user.type,
      //     difficulty: user.difficulty,
      //   };
      // }

      const res = await fetchAllPapersApi(query);
      const {success, papers, message} = res;
      if(success){
        setPapers(papers);
        toast({
          title: "Success",
          description: message,
        })
        console.log("Papers API Response:", papers);
      }
      console.log("Questions API Response:", res);
      } catch (error) {
       console.log(error) 
      }
    }
    fetchPapers();
  }, [user, router]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user.name}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role !== "student" && (
            <Link href="/dashboard/generate">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Paper
              </Button>
            </Link>
          )}
        </div>
      </div>

      {user.role !== "student" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Papers Generated
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,240</div>
              <p className="text-xs text-muted-foreground">
                +18% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Questions
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45,231</div>
              <p className="text-xs text-muted-foreground">
                +201 new this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">573</div>
              <p className="text-xs text-muted-foreground">
                +12 since yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Downloads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.5k</div>
              <p className="text-xs text-muted-foreground">
                +4% from last week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Papers</CardTitle>
            <CardDescription>
              You have generated {RECENT_PAPERS.length} papers this week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {console.log(papers)}
              {papers.map((paper) => (
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
                  <div className="ml-auto flex items-center gap-2">
                    {/* <div
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        paper.status === "Generated"
                          ? "bg-green-100 text-green-800"
                          : paper.status === "Draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {paper.status}
                    </div> */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePaperClick(paper.id)}
                      className="hover:bg-muted"
                      title="View paper details"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for {user.role}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start bg-transparent"
              onClick={() => router.push("/dashboard/questions/new")}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
            {user.role !== "student" && (
              <Button
                variant="outline"
                className="justify-start bg-transparent"
                onClick={() => router.push("/dashboard/users")}
              >
                <Users className="mr-2 h-4 w-4" /> Manage Students
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
