"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { analyzeGame, identifyKeyMoments, generateQuickTips } from "@/ai/flows/ai-post-game-analysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Types for the AI responses
interface KeyMoment {
  turn: number;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  alternativeAction?: string;
}

interface Mistake {
  turn: number;
  description: string;
  severity: 'major' | 'minor';
  suggestion: string;
}

interface GameAnalysis {
  gameSummary: string;
  keyMoments: KeyMoment[];
  mistakes: Mistake[];
  strengths: string[];
  improvementAreas: string[];
  deckSuggestions: Array<{ card: string; reason: string }>;
  overallRating: number;
  tips: string[];
}

interface KeyMomentsResult {
  moments: Array<{
    turn: number;
    description: string;
    type: string;
    whatHappened: string;
    couldHaveHappened?: string;
  }>;
  summary: string;
}

interface QuickTips {
  tips: string[];
  focusAreas: string[];
}

export default function GameAnalysisPage() {
  const { toast } = useToast();
  const [isAnalyzing, startAnalysis] = useTransition();
  
  // Analysis mode state
  const [replayText, setReplayText] = useState("");
  const [playerName, setPlayerName] = useState("Player");
  const [analysisResult, setAnalysisResult] = useState<GameAnalysis | null>(null);
  const [keyMomentsResult, setKeyMomentsResult] = useState<KeyMomentsResult | null>(null);
  const [quickTipsResult, setQuickTipsResult] = useState<QuickTips | null>(null);
  const [activeTab, setActiveTab] = useState("full");

  const handleFullAnalysis = () => {
    if (!replayText.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter the game replay data.",
      });
      return;
    }

    startAnalysis(async () => {
      try {
        let replayData;
        try {
          replayData = JSON.parse(replayText);
        } catch {
          // If not valid JSON, wrap it as a simple text replay
          replayData = { textReplay: replayText };
        }
        
        const result = await analyzeGame({
          replay: replayData,
          playerName,
        });
        
        setAnalysisResult(result);
        toast({
          title: "Analysis Complete",
          description: "Your game analysis is ready.",
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Failed to analyze game. Please check your replay data and try again.",
        });
      }
    });
  };

  const handleKeyMoments = () => {
    if (!replayText.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter the game replay data.",
      });
      return;
    }

    startAnalysis(async () => {
      try {
        let replayData;
        try {
          replayData = JSON.parse(replayText);
        } catch {
          replayData = { textReplay: replayText };
        }
        
        const result = await identifyKeyMoments({
          replay: replayData,
          playerName,
        });
        
        setKeyMomentsResult(result);
        toast({
          title: "Analysis Complete",
          description: "Key moments identified.",
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Failed to identify key moments.",
        });
      }
    });
  };

  const handleQuickTips = () => {
    if (!replayText.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter the game replay data.",
      });
      return;
    }

    startAnalysis(async () => {
      try {
        let replayData;
        try {
          replayData = JSON.parse(replayText);
        } catch {
          replayData = { textReplay: replayText };
        }
        
        const result = await generateQuickTips({
          replay: replayData,
          playerName,
        });
        
        setQuickTipsResult(result);
        toast({
          title: "Tips Generated",
          description: "Quick tips are ready.",
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: "Failed to generate tips.",
        });
      }
    });
  };

  return (
    <div className="flex h-full min-h-svh w-full flex-col p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Game Analysis</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered analysis of your games to help you improve.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Game Replay Data</CardTitle>
            <CardDescription>
              Paste your game replay or game log below. Can be JSON or text format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replay">Game Replay</Label>
              <Textarea
                id="replay"
                placeholder='Paste game replay here (JSON or text)&#10;Example JSON:&#10;{"actions":[{"turn":1,"player":"Player","action":"play","card":"Forest"}]}'
                value={replayText}
                onChange={(e) => setReplayText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="full">Full Analysis</TabsTrigger>
                <TabsTrigger value="moments">Key Moments</TabsTrigger>
                <TabsTrigger value="tips">Quick Tips</TabsTrigger>
              </TabsList>

              {/* Full Analysis Tab */}
              <TabsContent value="full" className="space-y-4">
                {!analysisResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Enter replay data and click Analyze to get a comprehensive game analysis.</p>
                    <Button 
                      onClick={handleFullAnalysis} 
                      disabled={isAnalyzing}
                      className="mt-4"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Game"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-lg">
                        Rating: {analysisResult.overallRating}/10
                      </Badge>
                      <Button 
                        variant="outline" 
                        onClick={handleFullAnalysis}
                        disabled={isAnalyzing}
                      >
                        Re-analyze
                      </Button>
                    </div>
                    
                    <Alert>
                      <AlertTitle>Game Summary</AlertTitle>
                      <AlertDescription>{analysisResult.gameSummary}</AlertDescription>
                    </Alert>

                    {analysisResult.strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Strengths</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {analysisResult.strengths.map((s, i) => (
                            <li key={i} className="text-sm">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.keyMoments.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Moments</h4>
                        <div className="space-y-2">
                          {analysisResult.keyMoments.map((m, i) => (
                            <div key={i} className={`p-2 rounded border-l-4 ${
                              m.impact === 'positive' ? 'border-l-green-500 bg-green-50' :
                              m.impact === 'negative' ? 'border-l-red-500 bg-red-50' :
                              'border-l-gray-500 bg-gray-50'
                            }`}>
                              <div className="text-sm font-medium">Turn {m.turn}: {m.description}</div>
                              {m.alternativeAction && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Alternative: {m.alternativeAction}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisResult.mistakes.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Areas to Improve</h4>
                        <div className="space-y-2">
                          {analysisResult.mistakes.map((m, i) => (
                            <div key={i} className="p-2 rounded bg-amber-50 border border-amber-200">
                              <div className="text-sm">
                                <span className="font-medium">Turn {m.turn}:</span> {m.description}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Tip: {m.suggestion}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisResult.tips.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tips for Future Games</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {analysisResult.tips.map((t, i) => (
                            <li key={i} className="text-sm">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Key Moments Tab */}
              <TabsContent value="moments" className="space-y-4">
                {!keyMomentsResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Enter replay data to identify key moments.</p>
                    <Button 
                      onClick={handleKeyMoments} 
                      disabled={isAnalyzing}
                      className="mt-4"
                    >
                      {isAnalyzing ? "Analyzing..." : "Find Key Moments"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm mb-4">{keyMomentsResult.summary}</div>
                    {keyMomentsResult.moments.map((m, i) => (
                      <div key={i} className="p-3 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">Turn {m.turn}</Badge>
                          <Badge>{m.type.replace('_', ' ')}</Badge>
                        </div>
                        <div className="text-sm">{m.whatHappened}</div>
                        {m.couldHaveHappened && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Could have been: {m.couldHaveHappened}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Quick Tips Tab */}
              <TabsContent value="tips" className="space-y-4">
                {!quickTipsResult ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Enter replay data for quick tips.</p>
                    <Button 
                      onClick={handleQuickTips} 
                      disabled={isAnalyzing}
                      className="mt-4"
                    >
                      {isAnalyzing ? "Generating..." : "Get Tips"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Quick Tips</h4>
                      <ul className="list-disc list-inside space-y-2">
                        {quickTipsResult.tips.map((t, i) => (
                          <li key={i} className="text-sm">{t}</li>
                        ))}
                      </ul>
                    </div>
                    {quickTipsResult.focusAreas.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Focus Areas</h4>
                        <div className="flex flex-wrap gap-2">
                          {quickTipsResult.focusAreas.map((f, i) => (
                            <Badge key={i} variant="secondary">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
