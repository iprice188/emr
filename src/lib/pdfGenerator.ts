import { jsPDF } from 'jspdf'
import type { Job, Customer, Settings } from '@/types/database'

type JobWithCustomer = Job & { customer: Customer }

// Helper function to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const generateQuotePDF = async (
  job: JobWithCustomer,
  settings: Settings
) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  let yPos = 15

  // Add black header background with gradient fade
  pdf.setFillColor(0, 0, 0)
  pdf.rect(0, 0, pageWidth, 50, 'F')

  // Create gradient fade from black to white
  for (let i = 0; i < 15; i++) {
    const gray = Math.floor((i / 15) * 255)
    pdf.setFillColor(gray, gray, gray)
    pdf.rect(0, 50 + i, pageWidth, 1, 'F')
  }

  // Add logo at top left (replaces business info text)
  try {
    const logoData = await loadImageAsBase64('/emr-logo.png')
    pdf.addImage(logoData, 'PNG', 20, yPos, 60, 0) // 60mm wide, auto height
    yPos += 50 // Space after logo
  } catch (error) {
    console.error('Failed to load logo:', error)
    // Fallback to text if logo fails
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255) // White text on black background
    pdf.text(settings.business_name || 'Business Name', 20, yPos)
    pdf.setTextColor(0, 0, 0) // Reset to black
    yPos += 10
  }

  // Title
  yPos += 15
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('QUOTATION', pageWidth / 2, yPos, { align: 'center' })

  // Customer Info
  yPos += 15
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Customer:', 20, yPos)

  pdf.setFont('helvetica', 'normal')
  yPos += 7
  pdf.text(job.customer.name, 20, yPos)

  if (job.customer.address) {
    const customerAddressLines = job.customer.address.split('\n')
    customerAddressLines.forEach(line => {
      yPos += 5
      pdf.text(line, 20, yPos)
    })
  }

  // Quote Details
  yPos += 10
  pdf.setFont('helvetica', 'bold')
  pdf.text('Job:', 20, yPos)
  pdf.setFont('helvetica', 'normal')
  yPos += 7
  pdf.text(job.title, 20, yPos)

  if (job.description) {
    yPos += 7
    const descLines = pdf.splitTextToSize(job.description, 170)
    pdf.text(descLines, 20, yPos)
    yPos += (descLines.length * 5)
  }

  if (job.job_address) {
    yPos += 7
    pdf.setFont('helvetica', 'bold')
    pdf.text('Location:', 20, yPos)
    pdf.setFont('helvetica', 'normal')
    yPos += 5
    const jobAddressLines = job.job_address.split('\n')
    jobAddressLines.forEach(line => {
      yPos += 5
      pdf.text(line, 20, yPos)
    })
  }

  // Quote Date
  yPos += 10
  if (job.quote_date) {
    pdf.text(`Quote Date: ${new Date(job.quote_date).toLocaleDateString()}`, 20, yPos)
    yPos += 5
  }

  // Cost Breakdown
  yPos += 10
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Cost Breakdown', 20, yPos)
  yPos += 10

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  // Table header
  pdf.setFillColor(240, 240, 240)
  pdf.rect(20, yPos - 5, 170, 8, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.text('Item', 25, yPos)
  pdf.text('Amount', 160, yPos, { align: 'right' })
  yPos += 10

  pdf.setFont('helvetica', 'normal')

  // Materials
  if (job.materials_cost && job.materials_cost > 0) {
    pdf.text('Materials', 25, yPos)
    pdf.text(`£${job.materials_cost.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 6

    if (job.materials_notes) {
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      const matNotes = pdf.splitTextToSize(job.materials_notes, 140)
      pdf.text(matNotes, 30, yPos)
      yPos += (matNotes.length * 4)
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
    }
  }

  // Labour
  if (job.labour_cost && job.labour_cost > 0) {
    yPos += 3
    pdf.text('Labour', 25, yPos)
    pdf.text(`£${job.labour_cost.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 6

    if (job.labour_days && job.labour_day_rate) {
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`${job.labour_days} days @ £${job.labour_day_rate.toFixed(2)}/day`, 30, yPos)
      yPos += 4
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
    }
  }

  // Other costs
  if (job.other_costs && job.other_costs > 0) {
    yPos += 3
    pdf.text('Other Costs', 25, yPos)
    pdf.text(`£${job.other_costs.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 6

    if (job.other_costs_notes) {
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      const otherNotes = pdf.splitTextToSize(job.other_costs_notes, 140)
      pdf.text(otherNotes, 30, yPos)
      yPos += (otherNotes.length * 4)
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
    }
  }

  // Subtotal
  yPos += 5
  pdf.line(20, yPos, 190, yPos)
  yPos += 8
  pdf.setFont('helvetica', 'bold')
  pdf.text('Subtotal:', 25, yPos)
  pdf.text(`£${(job.subtotal || 0).toFixed(2)}`, 185, yPos, { align: 'right' })

  // VAT
  if (job.vat_amount && job.vat_amount > 0) {
    yPos += 7
    pdf.setFont('helvetica', 'normal')
    pdf.text('VAT (20%):', 25, yPos)
    pdf.text(`£${job.vat_amount.toFixed(2)}`, 185, yPos, { align: 'right' })
  }

  // Total
  yPos += 10
  pdf.setFillColor(240, 240, 240)
  pdf.rect(20, yPos - 5, 170, 10, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('TOTAL:', 25, yPos)
  pdf.text(`£${(job.total || 0).toFixed(2)}`, 185, yPos, { align: 'right' })

  // VAT Number
  if (settings.vat_registered && settings.vat_number) {
    yPos += 15
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`VAT Registration Number: ${settings.vat_number}`, 20, yPos)
  }

  // Footer notes
  yPos += 10
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  if (job.quote_date) {
    const quoteDate = new Date(job.quote_date).toLocaleDateString()
    pdf.text(`Valid for 30 days from ${quoteDate}`, 20, yPos)
    yPos += 5
  }
  pdf.text('Payment terms and conditions apply upon acceptance.', 20, yPos)

  return pdf
}

export const generateInvoicePDF = async (
  job: JobWithCustomer,
  settings: Settings
) => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  let yPos = 15

  // Add black header background with gradient fade
  pdf.setFillColor(0, 0, 0)
  pdf.rect(0, 0, pageWidth, 50, 'F')

  // Create gradient fade from black to white
  for (let i = 0; i < 15; i++) {
    const gray = Math.floor((i / 15) * 255)
    pdf.setFillColor(gray, gray, gray)
    pdf.rect(0, 50 + i, pageWidth, 1, 'F')
  }

  // Add logo at top left (replaces business info text)
  try {
    const logoData = await loadImageAsBase64('/emr-logo.png')
    pdf.addImage(logoData, 'PNG', 20, yPos, 60, 0) // 60mm wide, auto height
    yPos += 50 // Space after logo
  } catch (error) {
    console.error('Failed to load logo:', error)
    // Fallback to text if logo fails
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255) // White text on black background
    pdf.text(settings.business_name || 'Business Name', 20, yPos)
    pdf.setTextColor(0, 0, 0) // Reset to black
    yPos += 10
  }

  // Title
  yPos += 15
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('INVOICE', pageWidth / 2, yPos, { align: 'center' })

  // Invoice Number
  yPos += 10
  pdf.setFontSize(12)
  if (job.invoice_number) {
    pdf.text(`Invoice #${job.invoice_number}`, pageWidth / 2, yPos, { align: 'center' })
  }

  // Customer Info
  yPos += 15
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Bill To:', 20, yPos)

  pdf.setFont('helvetica', 'normal')
  yPos += 7
  pdf.text(job.customer.name, 20, yPos)

  if (job.customer.address) {
    const customerAddressLines = job.customer.address.split('\n')
    customerAddressLines.forEach(line => {
      yPos += 5
      pdf.text(line, 20, yPos)
    })
  }

  // Invoice Details
  yPos += 10
  if (job.invoice_date) {
    pdf.text(`Invoice Date: ${new Date(job.invoice_date).toLocaleDateString()}`, 20, yPos)
    yPos += 6
  }

  pdf.setFont('helvetica', 'bold')
  pdf.text('For:', 20, yPos)
  pdf.setFont('helvetica', 'normal')
  yPos += 6
  pdf.text(job.title, 20, yPos)

  if (job.description) {
    yPos += 6
    const descLines = pdf.splitTextToSize(job.description, 170)
    pdf.text(descLines, 20, yPos)
    yPos += (descLines.length * 5)
  }

  // Cost Breakdown
  yPos += 15
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Invoice Details', 20, yPos)
  yPos += 10

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  // Table header
  pdf.setFillColor(240, 240, 240)
  pdf.rect(20, yPos - 5, 170, 8, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.text('Item', 25, yPos)
  pdf.text('Amount', 160, yPos, { align: 'right' })
  yPos += 10

  pdf.setFont('helvetica', 'normal')

  // Materials
  if (job.materials_cost && job.materials_cost > 0) {
    pdf.text('Materials', 25, yPos)
    pdf.text(`£${job.materials_cost.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 7
  }

  // Labour
  if (job.labour_cost && job.labour_cost > 0) {
    pdf.text('Labour', 25, yPos)
    pdf.text(`£${job.labour_cost.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 7
  }

  // Other costs
  if (job.other_costs && job.other_costs > 0) {
    pdf.text('Other Costs', 25, yPos)
    pdf.text(`£${job.other_costs.toFixed(2)}`, 185, yPos, { align: 'right' })
    yPos += 7
  }

  // Subtotal
  yPos += 5
  pdf.line(20, yPos, 190, yPos)
  yPos += 8
  pdf.setFont('helvetica', 'bold')
  pdf.text('Subtotal:', 25, yPos)
  pdf.text(`£${(job.subtotal || 0).toFixed(2)}`, 185, yPos, { align: 'right' })

  // VAT
  if (job.vat_amount && job.vat_amount > 0) {
    yPos += 7
    pdf.setFont('helvetica', 'normal')
    pdf.text('VAT (20%):', 25, yPos)
    pdf.text(`£${job.vat_amount.toFixed(2)}`, 185, yPos, { align: 'right' })
  }

  // Total
  yPos += 10
  pdf.setFillColor(240, 240, 240)
  pdf.rect(20, yPos - 5, 170, 10, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('TOTAL DUE:', 25, yPos)
  pdf.text(`£${(job.total || 0).toFixed(2)}`, 185, yPos, { align: 'right' })

  // Payment Details
  yPos += 20
  pdf.setFontSize(12)
  pdf.text('Payment Details', 20, yPos)
  yPos += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  if (settings.bank_details) {
    const bankLines = settings.bank_details.split('\n')
    bankLines.forEach(line => {
      pdf.text(line, 20, yPos)
      yPos += 5
    })
  }

  // VAT Number
  if (settings.vat_registered && settings.vat_number) {
    yPos += 10
    pdf.setFontSize(8)
    pdf.text(`VAT Registration Number: ${settings.vat_number}`, 20, yPos)
  }

  // Footer
  yPos += 10
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  pdf.text('Thank you for your business!', 20, yPos)

  return pdf
}

export const downloadPDF = (pdf: jsPDF, filename: string) => {
  pdf.save(filename)
}

export const getPDFBlob = (pdf: jsPDF): Blob => {
  return pdf.output('blob')
}
