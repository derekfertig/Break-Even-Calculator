import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Info,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Check,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  FileText,
  Loader2,
  Share2,
  Copy,
  History,
  User as UserIcon,
  LogOut,
  Search,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { auth, db, signInWithPopup, googleProvider, onAuthStateChanged, User, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, getDoc, doc, updateDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Detailed state-specific fee data (estimated)
interface StateFeeConfig {
  titleInsuranceRate: number; // Percentage of loan amount
  stampsAndTaxesRate: number; // Percentage of loan amount (Transfer tax, doc stamps, etc.)
}

const STATE_FEE_DATA: Record<string, StateFeeConfig> = {
  'AL': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0015 },
  'AK': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0000 },
  'AZ': { titleInsuranceRate: 0.0045, stampsAndTaxesRate: 0.0001 },
  'AR': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0011 },
  'CA': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0011 },
  'CO': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0001 },
  'CT': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0025 },
  'DE': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0200 },
  'FL': { titleInsuranceRate: 0.0055, stampsAndTaxesRate: 0.0055 }, // Doc stamps + Intangible
  'GA': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0030 },
  'HI': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0010 },
  'ID': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'IL': { titleInsuranceRate: 0.0055, stampsAndTaxesRate: 0.0015 },
  'IN': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'IA': { titleInsuranceRate: 0.003, stampsAndTaxesRate: 0.0000 },
  'KS': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'KY': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'LA': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0000 },
  'ME': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0022 },
  'MD': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0110 },
  'MA': { titleInsuranceRate: 0.0045, stampsAndTaxesRate: 0.0045 },
  'MI': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'MN': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0023 },
  'MS': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'MO': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'MT': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'NE': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0017 },
  'NV': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0013 },
  'NH': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0075 },
  'NJ': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0040 },
  'NM': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'NY': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0105 }, // Mortgage recording tax
  'NC': { titleInsuranceRate: 0.003, stampsAndTaxesRate: 0.0020 },
  'ND': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'OH': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'OK': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0010 },
  'OR': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'PA': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0100 },
  'RI': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0046 },
  'SC': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0037 },
  'SD': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0000 },
  'TN': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0011 },
  'TX': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0000 },
  'UT': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'VT': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0125 },
  'VA': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0025 },
  'WA': { titleInsuranceRate: 0.0045, stampsAndTaxesRate: 0.0000 },
  'WV': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0055 },
  'WI': { titleInsuranceRate: 0.004, stampsAndTaxesRate: 0.0030 },
  'WY': { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.0000 },
  'DC': { titleInsuranceRate: 0.006, stampsAndTaxesRate: 0.0110 }
};

const STATES = Object.keys(STATE_FEE_DATA).sort();

const LENDER_FEE = 1795;
const CLOSING_FEE = 600;
const APPRAISAL_FEE = 600;
const CREDIT_REPORT_FEE = 299;
const TAX_SERVICE_FEE = 75;
const RECORDING_FEE_EST = 260; // Base recording charge

const REISSUE_CREDIT_PERCENT = 0.40; // 40% discount on title insurance

export default function RefinanceCalculator() {
  // Existing Loan State
  const [originalBalance, setOriginalBalance] = useState<number>(400000);
  const [originationMonth, setOriginationMonth] = useState<number>(new Date().getMonth());
  const [originationYear, setOriginationYear] = useState<number>(new Date().getFullYear() - 3);
  const [originalTerm, setOriginalTerm] = useState<number>(360); // in months
  const [existingRate, setExistingRate] = useState<number>(7.5);
  const [manualCurrentBalance, setManualCurrentBalance] = useState<number | null>(null);

  // New Loan State
  const [newRate, setNewRate] = useState<number>(6.25);
  const [newTerm, setNewTerm] = useState<number>(360); // in months
  const [selectedState, setSelectedState] = useState<string>('FL');
  const [pointsType, setPointsType] = useState<'none' | 'points' | 'credit'>('none');
  const [pointsValue, setPointsValue] = useState<number>(1); // percentage
  const [hasOriginalTitlePolicy, setHasOriginalTitlePolicy] = useState<boolean>(false);
  const [financeClosingCosts, setFinanceClosingCosts] = useState<boolean>(false);
  const [isClosingCostsExpanded, setIsClosingCostsExpanded] = useState<boolean>(false);
  const [savingsYears, setSavingsYears] = useState<number>(5);
  const [freedomCompareMode, setFreedomCompareMode] = useState<'new' | 'original'>('new');
  const [wealthRate, setWealthRate] = useState<number>(8);
  const [wealthToggle, setWealthToggle] = useState<'accelerated' | 'savings'>('accelerated');
  const [benchmarkType, setBenchmarkType] = useState<'sp500' | 'hysa'>('sp500');
  const [lookbackPeriod, setLookbackPeriod] = useState<number>(10);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Prepared For State
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState<string>('');
  const [borrowerEmail, setBorrowerEmail] = useState<string>('');

  // Firebase State
  const [isSaving, setIsSaving] = useState(false);
  const [currentPresentationId, setCurrentPresentationId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userPresentations, setUserPresentations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isClientView, setIsClientView] = useState(false);

  const handleAddressLookup = async (query: string) => {
    if (!query || query.length < 4) return;
    setIsSearchingAddress(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction: "Return only the best matching full postal address string for the query. Use Google Maps.",
          tools: [{ googleMaps: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        },
      });
      
      const newSuggestions: any[] = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      if (groundingChunks && groundingChunks.length > 0) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.maps && chunk.maps.title) {
            newSuggestions.push({ display_name: chunk.maps.title });
          }
        });
      }

      const suggestedAddress = response.text?.trim();
      if (suggestedAddress && suggestedAddress.length > 8) {
        if (!newSuggestions.some(s => s.display_name === suggestedAddress)) {
          if (/\d/.test(suggestedAddress)) {
            newSuggestions.push({ display_name: suggestedAddress });
          }
        }
      }

      if (newSuggestions.length > 0) {
        setAddressSuggestions(newSuggestions);
      }
    } catch (error) {
      console.error("Address lookup failed", error);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (propertyAddress.length >= 4) {
        handleAddressLookup(propertyAddress);
      } else {
        setAddressSuggestions([]);
      }
    }, 250); // Ultra-fast debounce
    return () => clearTimeout(timer);
  }, [propertyAddress]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check for ID in URL to load presentation
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      loadPresentation(id);
      setIsClientView(true);
    }
  }, []);

  const loadPresentation = async (id: string) => {
    try {
      const docRef = doc(db, 'presentations', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBorrowerName(data.borrowerName || '');
        setPropertyAddress(data.propertyAddress || '');
        setBorrowerEmail(data.borrowerEmail || '');
        setOriginalBalance(data.originalBalance);
        setOriginationMonth(data.originationMonth);
        setOriginationYear(data.originationYear);
        setOriginalTerm(data.originalTerm);
        setExistingRate(data.existingRate);
        setNewRate(data.newRate);
        setNewTerm(data.newTerm);
        setSelectedState(data.selectedState);
        setPointsType(data.pointsType);
        setPointsValue(data.pointsValue);
        setHasOriginalTitlePolicy(data.hasOriginalTitlePolicy);
        setFinanceClosingCosts(data.financeClosingCosts);
        setSavingsYears(data.savingsYears);
        setWealthRate(data.wealthRate);
        setWealthToggle(data.wealthToggle);
        setManualCurrentBalance(data.manualCurrentBalance);
        setCurrentPresentationId(id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `presentations/${id}`);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert(`Domain Unauthorized: Please add "${window.location.hostname}" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      } else {
        alert(`Login Error: ${error.message}`);
      }
    }
  };

  const savePresentation = async () => {
    if (!user) {
      try {
        await handleLogin();
        if (!auth.currentUser) return; // Login failed or cancelled
      } catch (error) {
        return;
      }
    }

    setIsSaving(true);
    const presentationData = {
      borrowerName,
      propertyAddress,
      borrowerEmail,
      originalBalance,
      originationMonth,
      originationYear,
      originalTerm,
      existingRate,
      newRate,
      newTerm,
      selectedState,
      pointsType,
      pointsValue,
      hasOriginalTitlePolicy,
      financeClosingCosts,
      savingsYears,
      wealthRate,
      wealthToggle,
      manualCurrentBalance,
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid
    };

    try {
      if (currentPresentationId) {
        await updateDoc(doc(db, 'presentations', currentPresentationId), presentationData);
      } else {
        const docRef = await addDoc(collection(db, 'presentations'), {
          ...presentationData,
          createdAt: serverTimestamp()
        });
        setCurrentPresentationId(docRef.id);
      }
      setShowShareModal(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, currentPresentationId ? `presentations/${currentPresentationId}` : 'presentations');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchUserPresentations = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'presentations'), where('createdBy', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const presentations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserPresentations(presentations);
      setShowHistoryModal(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'presentations');
    }
  };

  const shareUrl = currentPresentationId ? `${window.location.origin}${window.location.pathname}?id=${currentPresentationId}` : '';

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  }, []);

  // Calculations
  const calculateResults = useMemo(() => {
    // 0. Calculate Existing Monthly Payment (Auto-calculated)
    const existingMonthlyRate = existingRate / 100 / 12;
    const existingPayment = existingMonthlyRate > 0 
      ? (originalBalance * existingMonthlyRate * Math.pow(1 + existingMonthlyRate, originalTerm)) / (Math.pow(1 + existingMonthlyRate, originalTerm) - 1)
      : originalBalance / originalTerm;

    // 1. Calculate Amortized Balance
    const monthsPassed = (new Date().getFullYear() - originationYear) * 12 + (new Date().getMonth() - originationMonth);
    
    let amortizedBalance = originalBalance;
    if (existingMonthlyRate > 0) {
      // Balance after n months formula: B = P(1+r)^n - M[(1+r)^n - 1]/r
      amortizedBalance = originalBalance * Math.pow(1 + existingMonthlyRate, monthsPassed) - 
                         existingPayment * (Math.pow(1 + existingMonthlyRate, monthsPassed) - 1) / existingMonthlyRate;
    } else {
      amortizedBalance = originalBalance - (existingPayment * monthsPassed);
    }
    amortizedBalance = Math.max(0, amortizedBalance);

    const currentBalance = manualCurrentBalance !== null ? manualCurrentBalance : amortizedBalance;

    // 2. Payoff Calculation (Balance + 30 days interest)
    const dailyInterestRate = (existingRate / 100) / 365;
    const thirtyDayInterest = currentBalance * dailyInterestRate * 30;
    const payoffAmount = currentBalance + thirtyDayInterest;

    // 3. Closing Costs (Calculated on the payoff amount)
    const stateData = STATE_FEE_DATA[selectedState] || { titleInsuranceRate: 0.005, stampsAndTaxesRate: 0.001 };
    
    let titleInsurance = payoffAmount * stateData.titleInsuranceRate;
    if (hasOriginalTitlePolicy) {
      titleInsurance = titleInsurance * (1 - REISSUE_CREDIT_PERCENT);
    }

    const stampsAndTaxes = payoffAmount * stateData.stampsAndTaxesRate;
    
    let pointsAdjustment = 0;
    if (pointsType === 'points') {
      pointsAdjustment = payoffAmount * (pointsValue / 100);
    } else if (pointsType === 'credit') {
      pointsAdjustment = -(payoffAmount * (pointsValue / 100));
    }
    
    const estimatedClosingCosts = 
      LENDER_FEE + 
      CLOSING_FEE + 
      APPRAISAL_FEE + 
      CREDIT_REPORT_FEE + 
      TAX_SERVICE_FEE + 
      titleInsurance + 
      stampsAndTaxes + 
      RECORDING_FEE_EST +
      pointsAdjustment;

    // 4. New Loan Amount
    const newLoanAmount = financeClosingCosts ? payoffAmount + estimatedClosingCosts : payoffAmount;

    // 5. New Monthly Payment
    const newMonthlyRate = newRate / 100 / 12;
    const newMonthlyPayment = 
      newLoanAmount * 
      (newMonthlyRate * Math.pow(1 + newMonthlyRate, newTerm)) / 
      (Math.pow(1 + newMonthlyRate, newTerm) - 1);

    const monthlySavings = existingPayment - newMonthlyPayment;

    // 6. Hybrid Break-Even Calculation
    // Industry standard: If monthly payment is lower, break-even = Costs / Monthly Savings.
    // Professional standard: If monthly payment is higher (term reduction), break-even = Equity Gain Analysis.
    let breakEvenMonths = Infinity;
    
    if (monthlySavings > 0) {
      // Cash Flow Break-Even (What most users expect)
      breakEvenMonths = estimatedClosingCosts / monthlySavings;
    } else {
      // Equity/Interest Break-Even (For Term Reduction scenarios)
      let beBalanceExisting = currentBalance;
      let beBalanceNew = newLoanAmount;
      let cumulativeCashFlowSavings = financeClosingCosts ? 0 : -estimatedClosingCosts;

      for (let m = 1; m <= 360; m++) {
        // Existing Loan Progress
        let existingInterest = 0;
        let existingPrincipal = 0;
        if (m <= (originalTerm - monthsPassed) && beBalanceExisting > 0) {
          existingInterest = beBalanceExisting * existingMonthlyRate;
          existingPrincipal = Math.min(beBalanceExisting, existingPayment - existingInterest);
          beBalanceExisting -= existingPrincipal;
        }

        // New Loan Progress
        let newInterest = 0;
        let newPrincipal = 0;
        if (m <= newTerm && beBalanceNew > 0) {
          newInterest = beBalanceNew * newMonthlyRate;
          newPrincipal = Math.min(beBalanceNew, newMonthlyPayment - newInterest);
          beBalanceNew -= newPrincipal;
        }

        const currentExistingPayment = m <= (originalTerm - monthsPassed) ? existingPayment : 0;
        const currentNewPayment = m <= newTerm ? newMonthlyPayment : 0;
        cumulativeCashFlowSavings += (currentExistingPayment - currentNewPayment);

        const equityDifference = beBalanceExisting - beBalanceNew;
        const totalBenefit = equityDifference + cumulativeCashFlowSavings;

        if (totalBenefit >= 0) {
          breakEvenMonths = m;
          break;
        }
      }
    }

    // 7. Interest Savings Over Time
    const calcMonths = Math.min(savingsYears * 12, Math.max(newTerm, originalTerm - monthsPassed));
    let cumulativeInterestExisting = 0;
    let tempBalanceExisting = currentBalance;
    const remainingMonthsExisting = originalTerm - monthsPassed;

    for (let i = 0; i < calcMonths; i++) {
      if (i < remainingMonthsExisting && tempBalanceExisting > 0) {
        const interest = tempBalanceExisting * existingMonthlyRate;
        cumulativeInterestExisting += interest;
        const principal = existingPayment - interest;
        tempBalanceExisting -= principal;
      }
    }

    let cumulativeInterestNew = 0;
    let tempBalanceNew = newLoanAmount;
    for (let i = 0; i < calcMonths; i++) {
      if (i < newTerm && tempBalanceNew > 0) {
        const interest = tempBalanceNew * newMonthlyRate;
        cumulativeInterestNew += interest;
        const principal = newMonthlyPayment - interest;
        tempBalanceNew -= principal;
      }
    }

    const interestSavings = cumulativeInterestExisting - cumulativeInterestNew;
    
    // 1. Net Cash Flow Savings
    // Total payments avoided - Upfront cash paid
    const totalPaymentsExisting = existingPayment * Math.min(calcMonths, remainingMonthsExisting);
    const totalPaymentsNew = newMonthlyPayment * Math.min(calcMonths, newTerm);
    const upfrontCash = financeClosingCosts ? 0 : estimatedClosingCosts;
    const netCashFlowSavings = totalPaymentsExisting - (totalPaymentsNew + upfrontCash);

    // 3. Net Financial Benefit
    // The "True" wealth gain: Interest Saved - Total Closing Costs
    const netFinancialBenefit = interestSavings - estimatedClosingCosts;

    // 8. Freedom Point Calculation (Accelerated Payoff)
    let freedomMonths = 0;
    if (monthlySavings > 0) {
      let tempBalanceFreedom = newLoanAmount;
      const acceleratedPayment = newMonthlyPayment + monthlySavings;
      
      while (tempBalanceFreedom > 0 && freedomMonths < 600) { // Safety cap at 50 years
        const interest = tempBalanceFreedom * newMonthlyRate;
        const principal = acceleratedPayment - interest;
        tempBalanceFreedom -= principal;
        freedomMonths++;
      }
    } else {
      freedomMonths = newTerm;
    }

    // 9. Wealth Creation Opportunity
    const wealthMonthlyRate = wealthRate / 100 / 12;
    
    // Scenario A: Invest full payment after early payoff
    // Months to invest = (Original Term or New Term) - Freedom Months
    const monthsToInvestAccelerated = Math.max(0, (freedomCompareMode === 'new' ? newTerm : remainingMonthsExisting) - freedomMonths);
    const acceleratedPayment = existingPayment; // The payment used to accelerate payoff
    
    let wealthAccelerated = 0;
    if (wealthMonthlyRate > 0 && monthsToInvestAccelerated > 0) {
      wealthAccelerated = acceleratedPayment * (Math.pow(1 + wealthMonthlyRate, monthsToInvestAccelerated) - 1) / wealthMonthlyRate;
    } else {
      wealthAccelerated = acceleratedPayment * monthsToInvestAccelerated;
    }

    // Scenario B: Invest monthly savings for the full term
    const monthsToInvestSavings = newTerm;
    let wealthSavings = 0;
    if (wealthMonthlyRate > 0 && monthlySavings > 0) {
      wealthSavings = monthlySavings * (Math.pow(1 + wealthMonthlyRate, monthsToInvestSavings) - 1) / wealthMonthlyRate;
    } else {
      wealthSavings = Math.max(0, monthlySavings) * monthsToInvestSavings;
    }

    return {
      existingPayment,
      estimatedCurrentBalance: amortizedBalance,
      currentBalance,
      payoffAmount,
      thirtyDayInterest,
      newLoanAmount,
      newMonthlyPayment,
      monthlySavings,
      estimatedClosingCosts,
      breakEvenMonths,
      interestSavings,
      totalPaymentSavings: netCashFlowSavings,
      netFinancialBenefit,
      freedomMonths,
      remainingMonthsExisting,
      wealthAccelerated,
      wealthSavings,
      monthsToInvestAccelerated,
      breakdown: {
        lenderFee: LENDER_FEE,
        closingFee: CLOSING_FEE,
        appraisalFee: APPRAISAL_FEE,
        creditReportFee: CREDIT_REPORT_FEE,
        taxServiceFee: TAX_SERVICE_FEE,
        titleInsurance,
        stampsAndTaxes,
        recordingFee: RECORDING_FEE_EST,
        pointsAdjustment
      }
    };
  }, [originalBalance, originationMonth, originationYear, originalTerm, existingRate, manualCurrentBalance, newRate, newTerm, selectedState, pointsType, pointsValue, hasOriginalTitlePolicy, financeClosingCosts, savingsYears, wealthRate, freedomCompareMode]);

  const getBreakEvenColor = (months: number) => {
    if (months <= 0 || months === Infinity) return 'text-gray-400';
    if (months < 36) return 'text-emerald-500';
    if (months <= 48) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getBreakEvenBg = (months: number) => {
    if (months <= 0 || months === Infinity) return 'bg-gray-100';
    if (months < 36) return 'bg-emerald-50';
    if (months <= 48) return 'bg-amber-50';
    return 'bg-rose-50';
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const handleDownloadPresentation = async () => {
    if (!dashboardRef.current) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // 1. Prepare for capture
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const element = dashboardRef.current;
      
      // Tag all original elements so we can find them in the clone
      const allOriginals = Array.from(element.querySelectorAll('*'));
      allOriginals.forEach((el, i) => {
        (el as HTMLElement).dataset.pdfId = i.toString();
      });

      // 2. Visual Capture with "Presentation Mode" strategy
      const canvas = await html2canvas(element, {
        scale: 3, // Higher scale for better clarity
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f8fafc',
        logging: false,
        width: 1200,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedDashboard = clonedDoc.querySelector('#dashboard-container') as HTMLElement;
          
          if (clonedDashboard) {
            // Force layout for PDF
            clonedDashboard.style.width = '1200px';
            clonedDashboard.style.maxWidth = 'none';
            clonedDashboard.style.height = 'auto';
            clonedDashboard.style.padding = '80px 100px'; // More generous padding
            clonedDashboard.style.margin = '0';
            clonedDashboard.style.backgroundColor = '#f8fafc';
            clonedDashboard.style.position = 'relative';
            
            // Add a premium report header
            const header = clonedDoc.createElement('div');
            header.style.marginBottom = '60px';
            header.style.paddingBottom = '30px';
            header.style.borderBottom = '4px solid #002e5e';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'flex-end';
            header.innerHTML = `
              <div style="font-family: 'Inter', sans-serif;">
                <h1 style="color: #002e5e; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: -2px; text-transform: uppercase;">Refinance Analysis</h1>
                <p style="color: #64748b; font-size: 16px; margin: 8px 0 0 0; font-weight: 600;">PREPARED FOR: <span style="color: #0f172a;">${borrowerName.toUpperCase() || 'VALUED CLIENT'}</span> | ${selectedState} | ${new Date().toLocaleDateString()}</p>
              </div>
              <div style="text-align: right; font-family: 'Inter', sans-serif;">
                <p style="color: #002e5e; font-weight: 900; font-size: 22px; margin: 0; letter-spacing: -0.5px;">Freedom Point™</p>
                <p style="color: #ff6b00; font-size: 12px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Proprietary Financial Strategy</p>
              </div>
            `;
            clonedDashboard.prepend(header);

            // Add a footer
            const footer = clonedDoc.createElement('div');
            footer.style.marginTop = '60px';
            footer.style.paddingTop = '20px';
            footer.style.borderTop = '1px solid #e2e8f0';
            footer.style.textAlign = 'center';
            footer.style.color = '#94a3b8';
            footer.style.fontSize = '10px';
            footer.style.fontFamily = "'Inter', sans-serif";
            footer.innerHTML = `
              <p style="margin: 0;">CONFIDENTIAL FINANCIAL ANALYSIS | © ${new Date().getFullYear()} Freedom Point™ | ALL CALCULATIONS ARE ESTIMATES</p>
              <p style="margin: 4px 0 0 0;">This report does not constitute an offer for credit. Actual terms may vary based on final underwriting.</p>
            `;
            clonedDashboard.appendChild(footer);

            // Hide elements that shouldn't be in the PDF
            const ignored = clonedDashboard.querySelectorAll('[data-pdf-ignore="true"], button, input[type="range"]');
            ignored.forEach(el => (el as HTMLElement).style.setProperty('display', 'none', 'important'));

            // Force sticky elements to be static for PDF capture
            const stickyEls = clonedDashboard.querySelectorAll('.sticky');
            stickyEls.forEach(el => (el as HTMLElement).style.position = 'static');

            // Helper to convert any color to RGB/Hex using canvas
            const tempCanvas = clonedDoc.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            
            const bakeColor = (color: string) => {
              if (!ctx || !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return color;
              if (color.startsWith('rgb') || color.startsWith('#')) return color;
              try {
                ctx.fillStyle = color;
                const result = ctx.fillStyle;
                if (result.includes('oklab') || result.includes('oklch')) {
                  if (color.includes('--color-brand-blue')) return '#002e5e';
                  if (color.includes('--color-brand-orange')) return '#ff6b00';
                  if (color.includes('--color-brand-teal')) return '#a0d8d0';
                  return '#334155';
                }
                return result;
              } catch (e) {
                return '#334155';
              }
            };

            const sanitizeComplexValue = (val: string) => {
              if (!val) return val;
              if (val.includes('oklab') || val.includes('oklch')) {
                return val.replace(/(oklab|oklch)\([^)]+\)/g, '#334155');
              }
              return val;
            };

            // CRITICAL: Mirror styles and bake values
            const allClones = Array.from(clonedDashboard.querySelectorAll('*'));
            
            allClones.forEach((clonedEl) => {
              const htmlClonedEl = clonedEl as HTMLElement;
              
              // Bake input values to look like clean text without shifting layout
              if (htmlClonedEl.tagName === 'INPUT' || htmlClonedEl.tagName === 'SELECT') {
                const input = htmlClonedEl as HTMLInputElement | HTMLSelectElement;
                const val = input.tagName === 'SELECT' ? 
                  (input as HTMLSelectElement).options[(input as HTMLSelectElement).selectedIndex].text : 
                  input.value;
                
                const textWrapper = clonedDoc.createElement('div');
                textWrapper.textContent = val;
                textWrapper.style.fontSize = '20px';
                textWrapper.style.fontWeight = '900';
                textWrapper.style.color = '#0f172a';
                textWrapper.style.padding = '6px 0';
                textWrapper.style.borderBottom = '2px solid #e2e8f0';
                textWrapper.style.marginBottom = '4px';
                
                // If it was a range input, it's already hidden via querySelectorAll above
                if (input.type !== 'range') {
                  htmlClonedEl.parentNode?.replaceChild(textWrapper, htmlClonedEl);
                }
                return;
              }

              const pdfId = htmlClonedEl.dataset.pdfId;
              const originalEl = element.querySelector(`[data-pdf-id="${pdfId}"]`) as HTMLElement;
              
              if (originalEl) {
                const computed = window.getComputedStyle(originalEl);
                
                // List of properties to mirror to ensure layout and look are preserved
                const propsToBake = [
                  'backgroundColor', 'color', 'borderColor', 'fontSize', 'fontWeight', 
                  'padding', 'margin', 'display', 'flexDirection', 'alignItems', 
                  'justifyContent', 'gap', 'borderRadius', 'borderWidth', 
                  'borderStyle', 'width', 'height', 'position', 'top', 'left', 
                  'right', 'bottom', 'zIndex', 'boxSizing', 'flex', 'gridTemplateColumns',
                  'gridColumn', 'gridRow', 'textAlign', 'lineHeight', 'letterSpacing',
                  'visibility', 'opacity', 'overflow', 'gridGap', 'gridColumnStart', 
                  'gridColumnEnd', 'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows',
                  'columnGap', 'rowGap'
                ];

                propsToBake.forEach(prop => {
                  let val = computed[prop as any];
                  if (prop.toLowerCase().includes('color') || prop === 'fill' || prop === 'stroke') {
                    val = bakeColor(val);
                  }
                  (htmlClonedEl.style as any)[prop] = val;
                });

                // Special handling for shadow and complex values
                htmlClonedEl.style.boxShadow = sanitizeComplexValue(computed.boxShadow);
                
                // Force reset animations
                htmlClonedEl.style.transform = 'none';
                htmlClonedEl.style.transition = 'none';
                htmlClonedEl.style.animation = 'none';
                htmlClonedEl.style.opacity = '1';
                htmlClonedEl.style.visibility = 'visible';

                // Handle SVG specific styles
                if (htmlClonedEl.tagName.toLowerCase() === 'svg' || htmlClonedEl.closest('svg')) {
                  htmlClonedEl.style.fill = bakeColor(computed.fill);
                  htmlClonedEl.style.stroke = bakeColor(computed.stroke);
                }
              }
            });

            // Strip all stylesheets to prevent html2canvas from crashing on oklch
            // but keep the fonts
            const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(s => {
              if (s.tagName === 'LINK' && (s as HTMLLinkElement).href.includes('fonts.googleapis.com')) return;
              s.remove();
            });
          }
        }
      });

      // 3. Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = contentHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Refinance_Analysis_${selectedState}.pdf`);
    } catch (error) {
      console.error('Visual PDF failed:', error);
      
      // 4. Fallback: Data-Only PDF
      const doc = new jsPDF();
      const results = calculateResults;

      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text('Refinance Analysis Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${selectedState} | Date: ${new Date().toLocaleDateString()}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Current Loan', 'New Potential Loan']],
        body: [
          ['Loan Amount', formatCurrency(results.currentBalance), formatCurrency(results.newLoanAmount)],
          ['Interest Rate', `${existingRate}%`, `${newRate}%`],
          ['Monthly P&I Payment', formatCurrency(results.existingPayment), formatCurrency(results.newMonthlyPayment)],
          ['Monthly Savings', '-', formatCurrency(results.monthlySavings)],
          ['Break-Even Point', '-', `${results.breakEvenMonths === Infinity ? 'N/A' : Math.ceil(results.breakEvenMonths)} Months`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
      });

      let finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(14);
      doc.text('Financial Impact Summary', 14, finalY + 15);
      doc.setFontSize(10);
      doc.text(`Total Interest Savings (${savingsYears} Years): ${formatCurrency(results.interestSavings)}`, 14, finalY + 22);
      doc.text(`Net Cash Flow Savings (${savingsYears} Years): ${formatCurrency(results.totalPaymentSavings)}`, 14, finalY + 29);
      doc.setFontSize(14);
      doc.setTextColor(0, 128, 128); // Brand Teal
      doc.text(`Net Financial Benefit: ${formatCurrency(results.netFinancialBenefit)}`, 14, finalY + 39);
      doc.setTextColor(0, 0, 0); // Reset to black
      doc.setFontSize(10);
      doc.text(`Estimated Closing Costs: ${formatCurrency(results.estimatedClosingCosts)}`, 14, finalY + 49);
      
      doc.save(`Refinance_Report_${selectedState}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <div id="dashboard-container" ref={dashboardRef} className="max-w-[1440px] mx-auto p-4 md:p-8 font-sans text-slate-900">
      <header data-pdf-ignore="true" className="mb-6 text-center relative">
        <div className="absolute right-0 top-0 flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsClientView(!isClientView)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-all shadow-sm ${
                  isClientView 
                    ? 'bg-brand-orange text-white border-brand-orange' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserIcon size={16} />
                {isClientView ? 'Operator View' : 'Client View'}
              </button>
              <button 
                onClick={() => {
                  setCurrentPresentationId(null);
                  setBorrowerName('');
                  setPropertyAddress('');
                  setBorrowerEmail('');
                  // Optionally reset other fields to defaults
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <FileText size={16} />
                New
              </button>
              <button 
                onClick={fetchUserPresentations}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <History size={16} />
                Record Locator
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
                <span className="text-xs font-bold text-slate-600 hidden md:block">{user.displayName || user.email}</span>
                <button 
                  onClick={() => auth.signOut()}
                  className="p-1 hover:text-rose-500 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-bold hover:bg-brand-blue/90 transition-all shadow-md"
            >
              <UserIcon size={16} />
              Sign In
            </button>
          )}
        </div>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-2 bg-brand-blue text-white rounded-xl mb-2 shadow-lg shadow-brand-blue/20"
        >
          <Calculator size={24} />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter text-brand-blue mb-1">Refinance Break-Even Calculator</h1>
        <p className="text-slate-500 text-base max-w-2xl mx-auto">
          Compare your current mortgage with a new potential loan to see if refinancing makes financial sense for your business.
        </p>
      </header>

      {/* Prepared For Section */}
      <section className={`mb-8 rounded-3xl p-6 shadow-xl border transition-all ${
        isClientView 
          ? 'bg-gradient-to-br from-brand-blue to-[#001a35] border-white/10' 
          : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${
            isClientView ? 'bg-brand-orange/20 text-brand-orange' : 'bg-brand-teal/20 text-brand-blue'
          }`}>
            <UserIcon size={20} />
          </div>
          <h2 className={`text-2xl font-bold ${isClientView ? 'text-white' : 'text-slate-800'}`}>
            Prepared For:
          </h2>
        </div>
        
        {isClientView ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-orange">Borrower Name</label>
              <p className="text-xl font-black text-white">{borrowerName || "Derek Fertig"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-orange">Property Address</label>
              <p className="text-xl font-black text-white">{propertyAddress || "123 Main St, City, State"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-orange">Borrower Email</label>
              <p className="text-xl font-black text-white">{borrowerEmail || "derekfertig@gmail.com"}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Borrower Name</label>
              <input 
                type="text" 
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium"
              />
            </div>
            <div className="space-y-2 relative">
              <label className="text-sm font-medium text-slate-600">Property Address</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={propertyAddress}
                  onChange={(e) => {
                    setPropertyAddress(e.target.value);
                    setAddressSuggestions([]);
                  }}
                  placeholder="123 Main St, City, State"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {isSearchingAddress ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
              </div>
              
              {addressSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                  {addressSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPropertyAddress(suggestion.display_name);
                        setAddressSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                    >
                      {suggestion.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Borrower Email</label>
              <input 
                type="email" 
                value={borrowerEmail}
                onChange={(e) => setBorrowerEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={savePresentation}
                disabled={isSaving}
                className="w-full py-3 bg-brand-teal text-white rounded-xl font-bold hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-teal/10 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Save Record
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Existing Loan Card */}
          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Calendar size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Existing Loan Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  Original Loan Balance
                  <Info size={14} className="text-slate-400" />
                </label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" 
                    value={originalBalance}
                    onChange={(e) => setOriginalBalance(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Origination Date</label>
                <div className="flex gap-2">
                  <select 
                    value={originationMonth}
                    onChange={(e) => setOriginationMonth(Number(e.target.value))}
                    className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium appearance-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    value={originationYear}
                    onChange={(e) => setOriginationYear(Number(e.target.value))}
                    className="w-24 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Original Loan Term</label>
                <select 
                  value={originalTerm}
                  onChange={(e) => setOriginalTerm(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium appearance-none"
                >
                  <option value={360}>30 Year Fixed</option>
                  <option value={300}>25 Year Fixed</option>
                  <option value={240}>20 Year Fixed</option>
                  <option value={180}>15 Year Fixed</option>
                  <option value={120}>10 Year Fixed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Interest Rate (%)</label>
                <input 
                  type="number" 
                  step="0.125"
                  value={existingRate}
                  onChange={(e) => setExistingRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-blue transition-all outline-none font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Current P&I Payment (Auto)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    readOnly
                    value={Math.round(calculateResults.existingPayment)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl outline-none font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Payoff Estimation Card */}
          <section className="bg-brand-blue rounded-3xl p-5 shadow-lg text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div data-pdf-ignore="true" className="p-2 bg-white/10 rounded-lg">
                  <ReceiptText size={20} className="text-brand-teal" />
                </div>
                <h2 className="text-2xl font-bold text-white">Payoff Estimation</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-white/60 text-xs uppercase tracking-wider font-bold">Est. Current Balance</p>
                  <div className="relative group">
                    <DollarSign size={20} className="absolute left-0 top-1/2 -translate-y-1/2 text-white" />
                    <input 
                      type="number"
                      value={manualCurrentBalance !== null ? manualCurrentBalance : Math.round(calculateResults.estimatedCurrentBalance)}
                      onChange={(e) => setManualCurrentBalance(Number(e.target.value))}
                      className="bg-transparent border-b border-white/20 focus:border-white outline-none text-3xl font-black text-white w-full pl-6 py-1 transition-colors"
                    />
                    {manualCurrentBalance !== null && (
                      <button 
                        onClick={() => setManualCurrentBalance(null)}
                        className="absolute -right-2 -top-2 bg-white/10 hover:bg-white/20 text-[10px] px-2 py-1 rounded-full transition-colors"
                      >
                        Reset to Calc
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 italic">Calculated via amortization from origination</p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/60 text-xs uppercase tracking-wider font-bold">Total Payoff Amount</p>
                  <p className="text-3xl font-black text-brand-teal">{formatCurrency(calculateResults.payoffAmount)}</p>
                  <p className="text-[10px] text-white/40 italic">Includes {formatCurrency(calculateResults.thirtyDayInterest)} (30 days interest)</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex items-start gap-3">
                <AlertCircle size={16} className="text-brand-orange shrink-0 mt-0.5" />
                <p className="text-xs text-white/70 leading-relaxed">
                  <strong>Payoff Note:</strong> The estimated payoff is calculated as the current unpaid principal balance plus 30 days of interest at your current rate of {existingRate}%. This provides a more accurate figure for your new loan amount.
                </p>
              </div>
            </div>
            <div data-pdf-ignore="true" className="absolute -right-12 -bottom-12 opacity-5 rotate-12">
              <ReceiptText size={200} />
            </div>
          </section>

          {/* New Loan Card */}
          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <TrendingDown size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">New Potential Loan</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">New Interest Rate (%)</label>
                <input 
                  type="number" 
                  step="0.125"
                  value={newRate}
                  onChange={(e) => setNewRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Loan Term</label>
                <select 
                  value={newTerm}
                  onChange={(e) => setNewTerm(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium appearance-none"
                >
                  <option value={360}>30 Year Fixed</option>
                  <option value={300}>25 Year Fixed</option>
                  <option value={240}>20 Year Fixed</option>
                  <option value={180}>15 Year Fixed</option>
                  <option value={120}>10 Year Fixed</option>
                </select>
              </div>

              <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">New Estimated P&I</p>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(calculateResults.newMonthlyPayment)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Monthly Savings</p>
                  <p className="text-2xl font-black text-emerald-600">
                    {calculateResults.monthlySavings > 0 ? formatCurrency(calculateResults.monthlySavings) : '$0'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  State
                  <MapPin size={14} className="text-slate-400" />
                </label>
                <select 
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-medium appearance-none"
                >
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-gray-dark">Discount Points / Lender Credit</label>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl h-[52px]">
                  <button 
                    onClick={() => setPointsType('none')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${pointsType === 'none' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    None
                  </button>
                  <button 
                    onClick={() => setPointsType('points')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${pointsType === 'points' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Points
                  </button>
                  <button 
                    onClick={() => setPointsType('credit')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${pointsType === 'credit' ? 'bg-brand-teal text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Credit
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-gray-dark">Original Title Policy?</label>
                <div className="flex items-center gap-4 h-[52px]">
                  <button 
                    onClick={() => setHasOriginalTitlePolicy(!hasOriginalTitlePolicy)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${hasOriginalTitlePolicy ? 'bg-brand-teal text-brand-blue shadow-md' : 'bg-slate-100 text-brand-gray-dark'}`}
                  >
                    {hasOriginalTitlePolicy ? 'Yes (Reissue Credit)' : 'No'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-brand-gray-dark">Closing Costs Method</label>
                <div className="flex items-center gap-4 h-[52px]">
                  <button 
                    onClick={() => setFinanceClosingCosts(!financeClosingCosts)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${financeClosingCosts ? 'bg-brand-orange text-white shadow-md' : 'bg-slate-100 text-brand-gray-dark'}`}
                  >
                    {financeClosingCosts ? 'Financing Costs' : 'Paying Cash'}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {pointsType !== 'none' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:col-span-2 space-y-2 overflow-hidden"
                  >
                    <label className="text-sm font-medium text-slate-600">
                      {pointsType === 'points' ? 'Discount Points' : 'Lender Credit'} Value (%)
                    </label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0.125" 
                        max="4" 
                        step="0.125"
                        value={pointsValue}
                        onChange={(e) => setPointsValue(Number(e.target.value))}
                        className={`flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${pointsType === 'points' ? 'accent-brand-orange' : 'accent-brand-teal'}`}
                      />
                      <span className={`w-16 text-center font-bold py-1 rounded-lg ${pointsType === 'points' ? 'text-brand-orange bg-brand-orange/10' : 'text-brand-teal bg-brand-teal/10'}`}>
                        {pointsValue}%
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interest Savings Section */}
              <div className="md:col-span-2 mt-4 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <TrendingDown size={18} className="text-emerald-500" />
                        Interest Savings Analysis
                      </h3>
                      <p className="text-xs text-slate-500">Compare cumulative interest over time</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase">Period:</span>
                      <span className="text-lg font-black text-brand-blue">{savingsYears} Years</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <input 
                        type="range" 
                        min="1" 
                        max={newTerm / 12} 
                        step="1"
                        value={savingsYears}
                        onChange={(e) => setSavingsYears(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                      />
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>1 Year</span>
                        <span>{newTerm / 12} Years</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Interest Saved</p>
                        <p className={`text-2xl font-black ${calculateResults.interestSavings > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(calculateResults.interestSavings)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Net Cash Flow Savings</p>
                        <p className={`text-2xl font-black ${calculateResults.totalPaymentSavings > 0 ? 'text-brand-blue' : 'text-rose-600'}`}>
                          {formatCurrency(calculateResults.totalPaymentSavings)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-brand-blue uppercase tracking-wider">Net Financial Benefit</p>
                          <p className="text-xs text-slate-500">Interest Saved - Total Closing Costs</p>
                        </div>
                        <p className={`text-3xl font-black ${calculateResults.netFinancialBenefit > 0 ? 'text-brand-blue' : 'text-rose-600'}`}>
                          {formatCurrency(calculateResults.netFinancialBenefit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Freedom Point Section */}
              <div className="md:col-span-2 mt-4">
                <div className="bg-brand-blue rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-brand-teal uppercase tracking-wide flex items-center gap-2">
                          <CheckCircle2 size={18} />
                          Freedom Point Analysis
                        </h3>
                        <p className="text-xs text-white/60">Apply your {formatCurrency(calculateResults.monthlySavings)} monthly savings to principal</p>
                      </div>
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Calendar size={20} className="text-brand-teal" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-6">
                      <div className="space-y-2">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Accelerated Payoff</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-brand-teal">
                            {(calculateResults.freedomMonths / 12).toFixed(1)}
                          </span>
                          <span className="text-xl font-bold text-white/60">Years</span>
                        </div>
                        <p className="text-xs text-white/70 italic">
                          Instead of the standard {newTerm / 12} year term
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3 text-brand-teal mb-2">
                          <TrendingDown size={18} />
                          <span className="text-sm font-bold">Time Saved</span>
                        </div>
                        <p className="text-3xl font-black">
                          {freedomCompareMode === 'new' 
                            ? ((newTerm - calculateResults.freedomMonths) / 12).toFixed(1)
                            : ((calculateResults.remainingMonthsExisting - calculateResults.freedomMonths) / 12).toFixed(1)
                          } Years Faster
                        </p>
                        <p className="text-[10px] text-white/40 mt-1 leading-tight">
                          {freedomCompareMode === 'new' 
                            ? `Compared to a standard ${newTerm / 12} year term.`
                            : `Compared to your remaining ${ (calculateResults.remainingMonthsExisting / 12).toFixed(1) } years.`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Prominent Toggle */}
                    <div className="bg-white/10 p-1 rounded-xl flex gap-1 border border-white/5">
                      <button 
                        onClick={() => setFreedomCompareMode('new')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${freedomCompareMode === 'new' ? 'bg-brand-teal text-brand-blue shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        vs New Term ({newTerm / 12}y)
                      </button>
                      <button 
                        onClick={() => setFreedomCompareMode('original')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${freedomCompareMode === 'original' ? 'bg-brand-teal text-brand-blue shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        vs Remaining ({ (calculateResults.remainingMonthsExisting / 12).toFixed(1) }y)
                      </button>
                    </div>
                  </div>
                  <div data-pdf-ignore="true" className="absolute -right-8 -bottom-8 opacity-5 -rotate-12">
                    <Calendar size={160} />
                  </div>
                </div>
              </div>

              {/* Wealth Creation Opportunity Section */}
              <div className="md:col-span-2 mt-6">
                <div className="bg-brand-orange/10 rounded-2xl p-5 border border-brand-orange/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-brand-orange uppercase tracking-wide flex items-center gap-2">
                          <TrendingDown size={18} />
                          Wealth Creation Opportunity
                        </h3>
                        <p className="text-xs text-slate-600">Maximize your financial future</p>
                      </div>
                      <div data-pdf-ignore="true" className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange">
                        <DollarSign size={20} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-4">
                        <div className="bg-white/50 p-4 rounded-xl border border-brand-orange/10">
                          <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-3">Rate of Return</p>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max="15" 
                              step="0.5"
                              value={wealthRate}
                              onChange={(e) => setWealthRate(Number(e.target.value))}
                              className="flex-1 h-1.5 bg-brand-orange/20 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                            />
                            <span className="w-12 text-center font-black text-brand-orange text-lg">
                              {wealthRate}%
                            </span>
                          </div>
                        </div>

                        <div className="bg-brand-blue text-white p-4 rounded-xl shadow-lg relative overflow-hidden transition-all">
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">Market Benchmark</p>
                                <div className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                                  <span className="text-[8px] text-emerald-400 font-bold uppercase">Live</span>
                                </div>
                              </div>
                              <div className="flex bg-white/10 p-0.5 rounded-lg">
                                <button 
                                  onClick={() => {
                                    setBenchmarkType('sp500');
                                    setWealthRate(12.4);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${benchmarkType === 'sp500' ? 'bg-brand-teal text-brand-blue' : 'text-white/60 hover:text-white'}`}
                                >
                                  S&P 500
                                </button>
                                <button 
                                  onClick={() => {
                                    setBenchmarkType('hysa');
                                    setWealthRate(4.5);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${benchmarkType === 'hysa' ? 'bg-brand-teal text-brand-blue' : 'text-white/60 hover:text-white'}`}
                                >
                                  HYSA
                                </button>
                              </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl font-black">
                                {benchmarkType === 'sp500' 
                                  ? (lookbackPeriod === 5 ? '14.5%' : lookbackPeriod === 10 ? '12.4%' : '10.2%') 
                                  : '4.5%'}
                              </p>
                              <span className="text-[10px] text-brand-teal font-bold uppercase">Avg Return</span>
                            </div>

                            {benchmarkType === 'sp500' && (
                              <div className="mt-3 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] text-white/40 uppercase font-bold">Lookback: {lookbackPeriod} Years</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="5" 
                                  max="20" 
                                  step="5"
                                  value={lookbackPeriod}
                                  onChange={(e) => setLookbackPeriod(Number(e.target.value))}
                                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                                />
                                <div className="flex justify-between text-[6px] text-white/20 font-bold uppercase">
                                  <span>5y</span>
                                  <span>10y</span>
                                  <span>20y</span>
                                </div>
                              </div>
                            )}

                            <p className="text-[10px] text-white/60 leading-tight mt-2">
                              {benchmarkType === 'sp500' 
                                ? `Historical S&P 500 performance over the last ${lookbackPeriod} years.` 
                                : 'Current average High Yield Savings Account interest rate.'}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[8px] text-white/40 uppercase font-bold tracking-widest">Last Updated: {lastUpdated}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const rate = benchmarkType === 'sp500' 
                                  ? (lookbackPeriod === 5 ? 14.5 : lookbackPeriod === 10 ? 12.4 : 10.2) 
                                  : 4.5;
                                setWealthRate(rate);
                              }}
                              className="mt-3 w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold border border-white/10 transition-all"
                            >
                              Apply to Calculator
                            </button>
                          </div>
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                            <TrendingDown size={80} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center space-y-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-brand-orange/10 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Potential Future Value</p>
                          <p className="text-4xl font-black text-brand-orange tracking-tighter">
                            {formatCurrency(wealthToggle === 'accelerated' ? calculateResults.wealthAccelerated : calculateResults.wealthSavings)}
                          </p>
                          <p className="text-xs text-slate-500 mt-2 font-medium">
                            {wealthToggle === 'accelerated' 
                              ? `By investing ${formatCurrency(calculateResults.existingPayment)}/mo for ${(calculateResults.monthsToInvestAccelerated / 12).toFixed(1)} years.`
                              : `By investing ${formatCurrency(calculateResults.monthlySavings)}/mo for ${newTerm / 12} years.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Wealth Toggle */}
                    <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 border border-slate-200">
                      <button 
                        onClick={() => setWealthToggle('accelerated')}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${wealthToggle === 'accelerated' ? 'bg-brand-orange text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                      >
                        Invest Accelerated Payment
                      </button>
                      <button 
                        onClick={() => setWealthToggle('savings')}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${wealthToggle === 'savings' ? 'bg-brand-orange text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                      >
                        Invest Monthly Savings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-8 space-y-6">
            {/* Break-Even Hero Card */}
            <motion.div 
              layout
              className={`rounded-[2.5rem] p-6 shadow-xl border-4 border-white overflow-hidden relative ${getBreakEvenBg(calculateResults.breakEvenMonths)}`}
            >
              <div className="relative z-10">
                <h3 className="text-slate-600 font-bold uppercase tracking-widest text-lg mb-2">Break-Even Point</h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-6xl font-black tracking-tighter ${getBreakEvenColor(calculateResults.breakEvenMonths)}`}>
                    {calculateResults.breakEvenMonths === Infinity ? '∞' : Math.ceil(calculateResults.breakEvenMonths)}
                  </span>
                  <span className="text-xl font-bold text-slate-500">months</span>
                </div>
                
                <div className="mt-4 flex items-center gap-3">
                  {calculateResults.breakEvenMonths < 36 ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-100/50 px-4 py-2 rounded-full">
                      <CheckCircle2 size={18} />
                      Strong Refinance Candidate
                    </div>
                  ) : calculateResults.breakEvenMonths <= 48 ? (
                    <div className="flex items-center gap-2 text-amber-700 font-bold bg-amber-100/50 px-4 py-2 rounded-full">
                      <Info size={18} />
                      Moderate Benefit
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-700 font-bold bg-rose-100/50 px-4 py-2 rounded-full">
                      <AlertCircle size={18} />
                      Long-term Commitment Needed
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decorative background element */}
              <div data-pdf-ignore="true" className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <ArrowRightLeft size={240} />
              </div>
            </motion.div>

            {/* Savings Breakdown */}
            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl">
              <h3 className="text-slate-400 font-bold uppercase tracking-widest text-lg mb-4">Financial Impact</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">New Loan Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(calculateResults.newLoanAmount)}
                    </p>
                    {financeClosingCosts && <p className="text-[10px] text-brand-teal">Includes financed closing costs</p>}
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors text-brand-teal">
                    <Calculator size={24} />
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">Monthly Savings</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {calculateResults.monthlySavings > 0 ? formatCurrency(calculateResults.monthlySavings) : '$0'}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors text-emerald-400">
                    <TrendingDown size={24} />
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-sm">New P&I Payment</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(calculateResults.newMonthlyPayment)}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors text-blue-400">
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div className="space-y-4">
                  <div 
                    className="flex justify-between items-center group cursor-pointer"
                    onClick={() => setIsClosingCostsExpanded(!isClosingCostsExpanded)}
                  >
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm flex items-center gap-2">
                        Est. Closing Costs ({selectedState})
                        {isClosingCostsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </p>
                      <p className="text-2xl font-bold text-brand-orange">
                        {formatCurrency(calculateResults.estimatedClosingCosts)}
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors text-brand-orange">
                      <ReceiptText size={24} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isClosingCostsExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-white/5 rounded-2xl p-4 space-y-4 border border-white/10"
                      >
                        {/* Lender Fees Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-brand-orange uppercase tracking-widest border-b border-white/5 pb-1">Lender Fees</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Lender Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.lenderFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Credit Report Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.creditReportFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Tax Service Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.taxServiceFee)}</span>
                          </div>
                        </div>

                        {/* Appraisal Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-brand-orange uppercase tracking-widest border-b border-white/5 pb-1">Appraisal Fee</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Appraisal Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.appraisalFee)}</span>
                          </div>
                        </div>

                        {/* Title Fees Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-brand-orange uppercase tracking-widest border-b border-white/5 pb-1">Title Fees</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Closing Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.closingFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Title Insurance (Est.) {hasOriginalTitlePolicy && '(Reissue Credit Applied)'}</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.titleInsurance)}</span>
                          </div>
                        </div>

                        {/* State Charges Section */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-brand-orange uppercase tracking-widest border-b border-white/5 pb-1">State Charges</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Recording Fee</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.recordingFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">State Stamps / Doc Stamps / Mortgage Tax</span>
                            <span className="font-medium">{formatCurrency(calculateResults.breakdown.stampsAndTaxes)}</span>
                          </div>
                        </div>

                        {calculateResults.breakdown.pointsAdjustment !== 0 && (
                          <div className="space-y-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest border-b border-white/5 pb-1 ${calculateResults.breakdown.pointsAdjustment > 0 ? 'text-brand-orange' : 'text-brand-orange'}`}>
                              {calculateResults.breakdown.pointsAdjustment > 0 ? 'Loan Options (Cost)' : 'Loan Options (Credit)'}
                            </p>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">
                                {calculateResults.breakdown.pointsAdjustment > 0 ? 'Discount Points' : 'Lender Credit'} ({pointsValue}%)
                              </span>
                              <span className={`font-medium ${calculateResults.breakdown.pointsAdjustment > 0 ? 'text-white' : 'text-brand-orange'}`}>
                                {calculateResults.breakdown.pointsAdjustment > 0 ? '' : '-'}{formatCurrency(Math.abs(calculateResults.breakdown.pointsAdjustment))}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="h-px bg-white/10 w-full pt-1" />
                        <div className="flex justify-between text-sm font-bold text-rose-400">
                          <span>Total Estimated Costs</span>
                          <span>{formatCurrency(calculateResults.estimatedClosingCosts)}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button 
                onClick={savePresentation}
                disabled={isSaving}
                data-pdf-ignore="true"
                className="w-full mt-6 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving Presentation...
                  </>
                ) : (
                  <>
                    Send Presentation
                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-slate-400 text-center px-6 leading-relaxed">
              *Calculations are estimates based on provided data and state averages. Actual closing costs, rates, and terms may vary based on credit score, lender, and specific property details. This is not an offer for credit.
            </p>
          </div>
        </div>
      </div>
    </div>
      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Presentation Ready!</h3>
                  <p className="text-slate-500">Share this unique link with your borrower to view the refinance analysis.</p>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareUrl}
                    className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-600 outline-none"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all flex items-center gap-2 ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white hover:bg-brand-blue/90'
                    }`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied && <span className="text-xs font-bold pr-1">Copied!</span>}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => {
                      setShowShareModal(false);
                      handleDownloadPresentation();
                    }}
                    className="flex-1 py-4 bg-brand-blue text-white rounded-2xl font-bold hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={18} />
                    PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal (Record Locator) */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative max-h-[80vh] flex flex-col"
            >
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <History className="text-brand-blue" />
                  Master Record Locator
                </h3>
                <p className="text-slate-500">Search and manage your previous refinance presentations.</p>
              </div>

              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by borrower name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {userPresentations
                  .filter(p => 
                    p.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    p.borrowerEmail.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
                  .map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:bg-white transition-all group flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 group-hover:text-brand-blue transition-colors">{p.borrowerName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <FileText size={12} />
                          {p.borrowerEmail || 'No email'} • {p.updatedAt instanceof Timestamp ? p.updatedAt.toDate().toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            loadPresentation(p.id);
                            setShowHistoryModal(false);
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all"
                        >
                          Load & Edit
                        </button>
                        <button 
                          onClick={() => {
                            setCurrentPresentationId(p.id);
                            setShowShareModal(true);
                            setShowHistoryModal(false);
                          }}
                          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-teal hover:border-brand-teal transition-all"
                          title="Share Link"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                {userPresentations.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No presentations found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
