import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FinanceService } from '../../services/finance/finance';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription, combineLatest } from 'rxjs';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.html',
  styleUrls: ['./reports.css'],
  standalone: false
})
export class Reports implements OnInit, OnDestroy {
  @ViewChild('incomeChartCanvas') incomeChartCanvas!: ElementRef;
  @ViewChild('varianceChartCanvas') varianceChartCanvas!: ElementRef;
  @ViewChild('breakdownChartCanvas') breakdownChartCanvas!: ElementRef; // <-- NEW

  userId: string = '';
  isLoading = true;
  isExporting = false;

  incomeChart: any;
  varianceChart: any;
  breakdownChart: any; // <-- NEW

  summary = { income: 0, expenses: 0, net: 0 };
  goalsProgress: any[] = [];

  private authSub!: Subscription;
  private dataSub!: Subscription;

  constructor(
    private financeService: FinanceService,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authSub = authState(this.auth).subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.generateReports();
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateReports() {
    this.dataSub = combineLatest([
      this.financeService.getUserTransactions(this.userId),
      this.financeService.getUserBudgets(this.userId),
      this.financeService.getUserGoals(this.userId)
    ]).subscribe(([transactions, budgets, goals]) => {
      
      // 1. CASH FLOW
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(t => {
        if (t.type === 'income') totalIncome += Number(t.amount);
        if (t.type === 'expense') totalExpense += Number(t.amount);
      });

      this.summary = {
        income: totalIncome,
        expenses: totalExpense,
        net: totalIncome - totalExpense
      };

      // 2. BUDGET VARIANCE
      let categoryLabels: string[] = [];
      let limitData: number[] = [];
      let spentData: number[] = [];

      budgets.forEach(b => {
        categoryLabels.push(b.category);
        limitData.push(Number(b.amount));

        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === b.category)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        spentData.push(spent);
      });

      // 3. EXPENSE BREAKDOWN (NEW LOGIC)
      let breakdownMap: { [key: string]: number } = {};
      transactions.forEach(t => {
        if (t.type === 'expense') {
          // If category is blank or missing, label it Uncategorized
          const cat = t.category && t.category !== '' ? t.category : 'Uncategorized';
          breakdownMap[cat] = (breakdownMap[cat] || 0) + Number(t.amount);
        }
      });
      
      const breakdownLabels = Object.keys(breakdownMap);
      const breakdownData = Object.values(breakdownMap);

      // 4. SAVINGS PROGRESS
      this.goalsProgress = goals.map(g => {
        let percent = (Number(g.savedAmount) / Number(g.targetAmount)) * 100;
        return {
          name: g.name,
          saved: Number(g.savedAmount),
          target: Number(g.targetAmount),
          percent: percent > 100 ? 100 : percent,
          isComplete: percent >= 100
        };
      });

      this.isLoading = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.renderIncomeChart(totalIncome, totalExpense);
        this.renderVarianceChart(categoryLabels, limitData, spentData);
        this.renderBreakdownChart(breakdownLabels, breakdownData); // <-- NEW
      }, 50);
    });
  }

  exportToPDF() {
    this.isExporting = true;
    const data = document.getElementById('pdf-content'); 

    if (data) {
      html2canvas(data, { scale: 2 }).then(canvas => {
        const imgWidth = 208; 
        const pageHeight = 295; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        const contentDataURL = canvas.toDataURL('image/png');
        let pdf = new jsPDF('p', 'mm', 'a4'); 
        let position = 0;

        pdf.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('Financial_Report.pdf'); 
        this.isExporting = false;
        this.cdr.detectChanges();
      }).catch(err => {
        console.error("Error generating PDF", err);
        this.isExporting = false;
        this.cdr.detectChanges();
      });
    }
  }

  renderIncomeChart(income: number, expense: number) {
    if (!this.incomeChartCanvas) return;
    if (this.incomeChart) this.incomeChart.destroy();

    this.incomeChart = new Chart(this.incomeChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Cash Flow'],
        datasets: [
          { label: 'Total Income', data: [income], backgroundColor: '#10b981' },
          { label: 'Total Expenses', data: [expense], backgroundColor: '#ef4444' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  renderVarianceChart(labels: string[], limits: number[], spent: number[]) {
    if (!this.varianceChartCanvas) return;
    if (this.varianceChart) this.varianceChart.destroy();

    this.varianceChart = new Chart(this.varianceChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Budget Limit', data: limits, backgroundColor: '#3f51b5' },
          { label: 'Actual Spent', data: spent, backgroundColor: '#f59e0b' } 
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // --- NEW: Category Breakdown Chart ---
  renderBreakdownChart(labels: string[], data: number[]) {
    if (!this.breakdownChartCanvas) return;
    if (this.breakdownChart) this.breakdownChart.destroy();

    // A beautiful array of colors for the different pie slices
    const pieColors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ];

    this.breakdownChart = new Chart(this.breakdownChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: pieColors,
          hoverOffset: 4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' } // Puts the labels nicely to the side
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSub) this.authSub.unsubscribe();
    if (this.dataSub) this.dataSub.unsubscribe();
    if (this.incomeChart) this.incomeChart.destroy();
    if (this.varianceChart) this.varianceChart.destroy();
    if (this.breakdownChart) this.breakdownChart.destroy(); // Cleanup
  }
}