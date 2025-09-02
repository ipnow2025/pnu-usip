"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Plus } from "lucide-react"

interface AddDocumentModalProps {
  open: boolean
  onClose: () => void
  onAddDocument: (doc: {
    id: string
    title: string
    applicationNumber: string
    applicant: string
    filingDate: string
  }) => void
}

export function AddDocumentModal({ open, onClose, onAddDocument }: AddDocumentModalProps) {
  const [title, setTitle] = useState("")
  const [applicationNumber, setApplicationNumber] = useState("")
  const [applicant, setApplicant] = useState("")

  const handleSubmit = () => {
    if (!title.trim() || !applicationNumber.trim() || !applicant.trim()) return
    onAddDocument({
      id: crypto.randomUUID(),
      title,
      applicationNumber,
      applicant,
      filingDate: new Date().toISOString().slice(0, 10),
    })
    onClose()
    setTitle("")
    setApplicationNumber("")
    setApplicant("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 서류 준비</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="특허명" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            placeholder="출원번호"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
          />
          <Input placeholder="출원인" value={applicant} onChange={(e) => setApplicant(e.target.value)} />
          <Button className="w-full" onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-2" /> 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
