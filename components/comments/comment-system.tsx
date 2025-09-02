"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Reply, Send, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Comment {
  id: string
  content: string
  author: string
  authorRole: string
  createdAt: Date
  updatedAt?: Date
  parentId?: string
  replies?: Comment[]
}

interface CommentSystemProps {
  patentId: string
  comments: Comment[]
  onAddComment: (content: string, parentId?: string) => void
  onEditComment: (commentId: string, content: string) => void
  onDeleteComment: (commentId: string) => void
  currentUser: string
  canComment: boolean
}

export function CommentSystem({
  patentId,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  currentUser,
  canComment,
}: CommentSystemProps) {
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim())
      setNewComment("")
    }
  }

  const handleSubmitReply = (parentId: string) => {
    if (replyContent.trim()) {
      onAddComment(replyContent.trim(), parentId)
      setReplyContent("")
      setReplyingTo(null)
    }
  }

  const handleEditSubmit = (commentId: string) => {
    if (editContent.trim()) {
      onEditComment(commentId, editContent.trim())
      setEditingComment(null)
      setEditContent("")
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingComment(null)
    setEditContent("")
  }

  const getRoleColor = (role: string) => {
    const colors = {
      PATENT_MANAGER: "bg-blue-100 text-blue-800",
      INVENTOR: "bg-green-100 text-green-800",
      US_ATTORNEY: "bg-purple-100 text-purple-800",
      EXTERNAL_REVIEWER: "bg-orange-100 text-orange-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      PATENT_MANAGER: "관리자",
      INVENTOR: "발명자",
      US_ATTORNEY: "변호사",
      EXTERNAL_REVIEWER: "검토자",
    }
    return labels[role as keyof typeof labels] || role
  }

  // 최상위 댓글만 필터링 (replies는 각 댓글 객체에 포함)
  const topLevelComments = comments.filter((comment) => !comment.parentId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>코멘트</span>
          <Badge variant="outline">{comments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 새 댓글 작성 */}
        {canComment && (
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="코멘트를 입력하세요..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitComment} disabled={!newComment.trim()} size="sm">
                <Send className="h-4 w-4 mr-2" />
                코멘트 작성
              </Button>
            </div>
          </div>
        )}

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* 메인 댓글 */}
              <div className="flex space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{comment.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <Badge className={getRoleColor(comment.authorRole)} variant="secondary">
                      {getRoleLabel(comment.authorRole)}
                    </Badge>
                    <span className="text-xs text-gray-500">{comment.createdAt.toLocaleString()}</span>
                    {comment.updatedAt && <span className="text-xs text-gray-400">(수정됨)</span>}
                  </div>

                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleEditSubmit(comment.id)}>
                          저장
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    {canComment && (
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(comment.id)} className="text-xs">
                        <Reply className="h-3 w-3 mr-1" />
                        답글
                      </Button>
                    )}

                    {comment.author === currentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(comment)}>
                            <Edit className="h-3 w-3 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteComment(comment.id)} className="text-red-600">
                            <Trash2 className="h-3 w-3 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>

              {/* 답글 작성 폼 */}
              {replyingTo === comment.id && (
                <div className="ml-11 space-y-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 입력하세요..."
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleSubmitReply(comment.id)} disabled={!replyContent.trim()}>
                      답글 작성
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {/* 답글 목록 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex space-x-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{reply.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{reply.author}</span>
                          <Badge className={getRoleColor(reply.authorRole)} variant="secondary">
                            {getRoleLabel(reply.authorRole)}
                          </Badge>
                          <span className="text-xs text-gray-500">{reply.createdAt.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">아직 코멘트가 없습니다</p>
            {canComment && <p className="text-xs mt-1">첫 번째 코멘트를 작성해보세요</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
