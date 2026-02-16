"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

// --- TYPES ---
type School = { id: number; name: string; region: string; division: string };
type Exam = { id: number; name: string; full_name: string; max_papers: number };
type Subject = { id: number; name: string; code: string };
type QueueItem = {
  id: number;
  schoolName: string;
  region: string;
  division: string;
  examName: string;
  subjectName: string;
  subjectCode: string;
  paper: string;
  count: number;
};

export default function Home() {
  // --- DATABASE DATA ---
  const [schools, setSchools] = useState<School[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // --- SELECTIONS ---
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // --- UI STATE ---
  const [schoolSearch, setSchoolSearch] = useState("");
  const [showSchoolList, setShowSchoolList] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // --- INPUTS ---
  const [studentCount, setStudentCount] = useState<string>("");
  const [papers, setPapers] = useState({ p1: true, p2: true, p3: false });
  const [printQueue, setPrintQueue] = useState<QueueItem[]>([]);

  // --- NEW ITEM FORMS ---
  const [newSchool, setNewSchool] = useState({
    name: "",
    region: "SOUTH WEST",
    division: "",
  });
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const fetchInitData = async () => {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      if (schoolData) setSchools(schoolData);

      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .order("id");
      if (examData) setExams(examData);
    };
    fetchInitData();
  }, []);

  // --- 2. LOAD SUBJECTS ---
  useEffect(() => {
    if (selectedExam) {
      const fetchSubjects = async () => {
        const { data } = await supabase
          .from("subjects")
          .select("*")
          .eq("exam_id", selectedExam.id)
          .order("name");
        if (data) setSubjects(data);
      };
      fetchSubjects();
      setPapers({ p1: true, p2: true, p3: false });
    } else {
      setSubjects([]);
    }
  }, [selectedExam]);

  // --- LOGIC: FILTER SCHOOLS ---
  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase()),
  );

  // --- LOGIC: ADD TO QUEUE ---
  const handleAddToQueue = () => {
    if (!selectedSchool || !selectedExam || !selectedSubject || !studentCount) {
      alert("Please fill in all fields");
      return;
    }

    const itemsToAdd: QueueItem[] = [];
    const countNum = parseInt(studentCount);

    if (papers.p1)
      itemsToAdd.push(createQueueItem("Paper 1", selectedSubject, countNum));
    if (papers.p2)
      itemsToAdd.push(createQueueItem("Paper 2", selectedSubject, countNum));
    if (selectedExam.max_papers === 3 && papers.p3) {
      itemsToAdd.push(createQueueItem("Paper 3", selectedSubject, countNum));
    }

    setPrintQueue([...itemsToAdd, ...printQueue]);

    // Reset Form
    setSelectedSubject(null);
    setStudentCount("");
    setPapers({ p1: true, p2: true, p3: false });
  };

  const createQueueItem = (
    paperName: string,
    subject: Subject,
    count: number,
  ): QueueItem => ({
    id: Date.now() + Math.random(),
    schoolName: selectedSchool!.name,
    region: selectedSchool!.region,
    division: selectedSchool!.division,
    examName: selectedExam!.name,
    subjectName: subject.name,
    subjectCode: subject.code || "-",
    paper: paperName,
    count: count,
  });

  // --- LOGIC: BATCH ADD ---
  const handleBatchAdd = (paperType: string) => {
    if (!selectedSchool || !selectedExam)
      return alert("Select School & Exam first");
    const batchItems = subjects.map((sub) =>
      createQueueItem(paperType, sub, 0),
    );
    setPrintQueue([...batchItems, ...printQueue]);
    setIsBatchModalOpen(false);
  };

  const updateQueueCount = (id: number, newCount: string) => {
    const updated = printQueue.map((item) =>
      item.id === id ? { ...item, count: parseInt(newCount) || 0 } : item,
    );
    setPrintQueue(updated);
  };

  const handleClearQueue = () => {
    if (confirm("Are you sure you want to delete everything in the list?")) {
      setPrintQueue([]);
    }
  };

  // --- LOGIC: SAVING NEW DATA ---
  const saveNewSchool = async () => {
    if (!newSchool.name || !newSchool.division) return alert("Fill all fields");
    const { data } = await supabase
      .from("schools")
      .insert([
        {
          name: newSchool.name.toUpperCase(),
          region: newSchool.region,
          division: newSchool.division.toUpperCase(),
        },
      ])
      .select();
    if (data) {
      setSchools(
        [...schools, data[0]].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedSchool(data[0]);
      setSchoolSearch(data[0].name);
      setIsSchoolModalOpen(false);
      setNewSchool({ name: "", region: "SOUTH WEST", division: "" });
    }
  };

  const saveNewSubject = async () => {
    if (!newSubject.name || !selectedExam) return alert("Fill all fields");
    const { data } = await supabase
      .from("subjects")
      .insert([
        {
          name: newSubject.name.toUpperCase(),
          code: newSubject.code.toUpperCase(),
          exam_id: selectedExam.id,
        },
      ])
      .select();
    if (data) {
      setSubjects(
        [...subjects, data[0]].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedSubject(data[0]);
      setIsSubjectModalOpen(false);
      setNewSubject({ name: "", code: "" });
    }
  };

  // ============================================================
  // === UPDATED PRINT LOGIC WITH BIGGER FONTS & ALIGNMENT ===
  // ============================================================
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const getLevelName = (examName: string) => {
      if (examName.includes("CAP")) return "ORDINARY LEVEL (CAP)";
      if (examName.includes("ATVEE")) return "ADVANCED LEVEL (ATVEE)";
      if (examName.includes("ITVEE")) return "INTERMEDIATE LEVEL (ITVEE)";
      return examName;
    };

    let pagesHtml = "";

    printQueue.forEach((item) => {
      const totalEnvelopes = Math.ceil((item.count || 1) / 50) || 1;

      // LOGIC CHANGE: SUPPLIED = REGISTERED + 2
      const numberSupplied = (item.count || 0) + 2;

      for (let i = 1; i <= totalEnvelopes; i++) {
        pagesHtml += `
            <div class="page page-break">
              
              <div class="row">
                <div class="label">REGION:</div>
                <div class="field">${item.region}</div>
              </div>

              <div class="row">
                <div class="label">DIVISION:</div>
                <div class="field">${item.division || ""}</div>
              </div>

              <div class="row">
                <div class="label">INSTITUTION/SCHOOL:</div>
                <div class="field">${item.schoolName}</div>
              </div>

              <div class="row">
                <div class="label">SUBJECT:</div>
                <div class="field" style="flex:3;">${item.subjectName}</div>
                <!-- Paper Number on its own line segment -->
                <div class="field" style="flex:1; margin-left:20px; text-align:center;">${item.paper}</div>
              </div>

              <div class="row">
                <div class="label">LEVEL:</div>
                <div class="field">${getLevelName(item.examName)}</div>
                <div class="label" style="margin-left:20px;">SUBJECT CODE:</div>
                <div class="field" style="width:100px; flex:none; text-align:center;">${item.subjectCode}</div>
              </div>

              <div class="row">
                <div class="label">NUMBER REGISTERED:</div>
                <div class="field">${item.count}</div>
                <div class="label" style="margin-left:20px;">NUMBER SUPPLIED:</div>
                
                <!-- Displaying the Calculated Supply Count -->
                <div class="field">${numberSupplied}</div> 
              </div>

              <div class="row" style="margin-top:30px;">
                <div class="label">DATE OF EXAMINATION:</div>
                <div class="field"></div>
              </div>

              <div class="row" style="margin-top:30px;">
                <div class="label">NUMBER OF ENVELOPS:</div>
                <div class="field" style="width:80px; flex:none; text-align:center;">${totalEnvelopes}</div>
                
                <div class="label" style="margin-left:20px;">ENVELOPS NO</div>
                <div class="field" style="width:80px; flex:none; text-align:center;">${i}</div>
                
                <div class="label" style="margin-left:10px;">OUT OF:</div>
                <div class="field" style="width:80px; flex:none; text-align:center;">${totalEnvelopes}</div>
              </div>

              <div class="row" style="margin-top:40px; border-top: 1px dashed #ccc; padding-top:20px;">
                <div class="label" style="width:auto;">TOTAL NUMBER OF ENVELOPS SUPPLIED FOR THIS SUBJECT:</div>
                <div class="field" style="width:100px; flex:none; text-align:center;">${totalEnvelopes}</div>
              </div>

            </div>
            `;
      }
    });

    const html = `
      <html>
        <head>
          <title>Exam Envelopes</title>
          <style>
            @media print { 
                .page-break { page-break-after: always; } 
                @page { margin: 10mm; }
            }
            body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
            }
            .page {
                border: 2px solid #000;
                padding: 40px;
                height: 90vh; 
                box-sizing: border-box;
                position: relative;
            }
            .row {
                display: flex;
                align-items: flex-end; /* Keeps text on the bottom line */
                margin-bottom: 25px;
            }
            .label {
                font-weight: 900;
                font-size: 18px;
                margin-right: 10px;
                white-space: nowrap;
                transform: translateY(-5px); /* Lift label slightly to match baseline */
            }
            
            /* === BOLDER & BIGGER FILLED TEXT === */
            .field {
                flex: 1;
                border-bottom: 3px solid #000;
                
                font-size: 26px; /* Bigger */
                font-weight: 900; /* Extra Bold */
                font-family: 'Arial Black', 'Helvetica Black', sans-serif; /* Thick font */
                
                padding-left: 10px;
                line-height: 1; /* Ensures text sits on the line */
                position: relative;
                top: 2px; /* Micro-adjustment to touch the line */
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold tracking-widest uppercase">
              Cameroon Exam System
            </h1>
            <p className="text-blue-200 text-sm">Automated Label Generation</p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold bg-blue-800 px-3 py-1 rounded-full inline-block">
              v3.1 TEMPLATE UPDATE
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/80 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/50 sticky top-6 z-40">
            <h2 className="text-lg font-bold mb-6 text-blue-900 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">🏢</span> Exam
              Context
            </h2>

            {/* SEARCH */}
            <div className="mb-6 group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Search School
                </label>
                <button
                  onClick={() => setIsSchoolModalOpen(true)}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2 py-1 rounded transition"
                >
                  + ADD NEW
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition outline-none font-semibold text-gray-700"
                  placeholder="Type to search..."
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setShowSchoolList(true);
                    setSelectedSchool(null);
                  }}
                  onFocus={() => setShowSchoolList(true)}
                />
                {showSchoolList && filteredSchools.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto mt-2 p-1">
                    {filteredSchools.map((s) => (
                      <li
                        key={s.id}
                        className="p-3 hover:bg-blue-50 rounded-lg cursor-pointer text-sm font-medium transition"
                        onClick={() => {
                          setSelectedSchool(s);
                          setSchoolSearch(s.name);
                          setShowSchoolList(false);
                        }}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* INFO BOXES */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                  Region
                </label>
                <div className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 font-bold text-sm">
                  {selectedSchool ? selectedSchool.region : "..."}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                  Division
                </label>
                <div className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 font-bold text-sm">
                  {selectedSchool ? selectedSchool.division : "..."}
                </div>
              </div>
            </div>

            {/* EXAM SELECT */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                Exam Type
              </label>
              <select
                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition outline-none font-semibold cursor-pointer shadow-sm"
                onChange={(e) => {
                  const ex = exams.find((x) => x.id === Number(e.target.value));
                  setSelectedExam(ex || null);
                }}
              >
                <option value="">-- Choose Exam --</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.full_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && selectedSchool && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-purple-200 transform hover:-translate-y-1 transition"
                >
                  ⚡ Batch Add All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-8">
          {/* ENTRY CARD */}
          <div
            className={`bg-white p-8 rounded-3xl shadow-xl transition-all duration-500 border border-gray-100 ${selectedExam ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none"}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="bg-green-100 p-2 rounded-lg mr-3 text-green-700">
                  📝
                </span>{" "}
                Manual Entry
              </h2>
              <button
                onClick={() => setIsSubjectModalOpen(true)}
                className="text-xs bg-green-50 text-green-700 font-bold px-3 py-1.5 rounded-full hover:bg-green-100 transition"
              >
                + New Subject
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">
                  Select Subject
                </label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium"
                  value={selectedSubject?.id || ""}
                  onChange={(e) => {
                    const sub = subjects.find(
                      (s) => s.id === Number(e.target.value),
                    );
                    setSelectedSubject(sub || null);
                  }}
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.code ? `(${sub.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">
                  Select Papers
                </label>
                <div className="flex space-x-3">
                  {["p1", "p2"].map((p, idx) => (
                    <label
                      key={p}
                      className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer p-3 rounded-xl border-2 transition ${papers[p as keyof typeof papers] ? "border-green-500 bg-green-50 text-green-700" : "border-gray-100 bg-white text-gray-400"}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={papers[p as keyof typeof papers]}
                        onChange={() =>
                          setPapers({
                            ...papers,
                            [p]: !papers[p as keyof typeof papers],
                          })
                        }
                      />
                      <span className="font-bold">Paper {idx + 1}</span>
                    </label>
                  ))}
                  {selectedExam && selectedExam.max_papers === 3 && (
                    <label
                      className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer p-3 rounded-xl border-2 transition ${papers.p3 ? "border-red-500 bg-red-50 text-red-700" : "border-gray-100 bg-white text-gray-400"}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={papers.p3}
                        onChange={() =>
                          setPapers({ ...papers, p3: !papers.p3 })
                        }
                      />
                      <span className="font-bold">Paper 3</span>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">
                  Number of Students
                </label>
                <input
                  type="number"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 outline-none font-bold text-xl text-center"
                  placeholder="0"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleAddToQueue}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg transition flex justify-center items-center group"
                >
                  <span>Add to Queue</span>{" "}
                  <span className="ml-2 group-hover:translate-x-1 transition">
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* QUEUE LIST */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h3 className="font-bold text-gray-700 text-lg">
                  🖨️ Print Queue{" "}
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({printQueue.length} items)
                  </span>
                </h3>
                {printQueue.length > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="text-xs text-red-500 hover:text-red-700 font-bold underline px-2"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {printQueue.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
                >
                  GENERATE PDF
                </button>
              )}
            </div>

            {printQueue.length === 0 ? (
              <div className="p-12 text-center text-gray-300">
                <p className="text-4xl mb-2">🕸️</p>
                <p>Queue is empty</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Subject Info</th>
                      <th className="p-4">Paper</th>
                      <th className="p-4 text-center">Count</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {printQueue.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/50 transition"
                      >
                        <td className="p-4">
                          <div className="font-bold text-gray-800">
                            {item.subjectName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {item.subjectCode}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${item.paper === "Paper 3" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {item.paper}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            className="w-16 p-1 text-center font-bold border border-gray-200 rounded focus:border-blue-500 outline-none"
                            value={item.count}
                            onChange={(e) =>
                              updateQueueCount(item.id, e.target.value)
                            }
                          />
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() =>
                              setPrintQueue(
                                printQueue.filter((x) => x.id !== item.id),
                              )
                            }
                            className="text-red-400 hover:text-red-600 font-bold p-2 hover:bg-red-50 rounded-lg"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full">
            <h3 className="text-2xl font-bold mb-2">⚡ Batch Add</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Add all {selectedExam?.name} subjects to the queue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleBatchAdd("Paper 1")}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl font-bold text-left flex justify-between group"
              >
                <span>Add All Paper 1</span>{" "}
                <span className="text-blue-500 group-hover:translate-x-1 transition">
                  →
                </span>
              </button>
              <button
                onClick={() => handleBatchAdd("Paper 2")}
                className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-xl font-bold text-left flex justify-between group"
              >
                <span>Add All Paper 2</span>{" "}
                <span className="text-blue-500 group-hover:translate-x-1 transition">
                  →
                </span>
              </button>
              {selectedExam?.max_papers === 3 && (
                <button
                  onClick={() => handleBatchAdd("Paper 3")}
                  className="w-full p-4 bg-gray-50 hover:bg-red-50 border border-gray-200 rounded-xl font-bold text-left flex justify-between group text-red-600"
                >
                  <span>Add All Paper 3</span>{" "}
                  <span className="group-hover:translate-x-1 transition">
                    →
                  </span>
                </button>
              )}
            </div>
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="mt-6 w-full py-3 text-gray-400 font-bold hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isSchoolModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            <h3 className="text-lg font-bold mb-4">Add New School</h3>
            <input
              className="w-full mb-3 p-3 bg-gray-50 border rounded-xl"
              placeholder="School Name"
              value={newSchool.name}
              onChange={(e) =>
                setNewSchool({ ...newSchool, name: e.target.value })
              }
            />
            <input
              className="w-full mb-3 p-3 bg-gray-50 border rounded-xl"
              placeholder="Division"
              value={newSchool.division}
              onChange={(e) =>
                setNewSchool({ ...newSchool, division: e.target.value })
              }
            />
            <select
              className="w-full mb-4 p-3 bg-gray-50 border rounded-xl"
              value={newSchool.region}
              onChange={(e) =>
                setNewSchool({ ...newSchool, region: e.target.value })
              }
            >
              {["SOUTH WEST", "LITTORAL", "CENTRE", "WEST", "NORTH WEST"].map(
                (r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ),
              )}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSchoolModalOpen(false)}
                className="px-4 py-2 text-gray-500 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveNewSchool}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            <h3 className="text-lg font-bold mb-4">Add New Subject</h3>
            <input
              className="w-full mb-3 p-3 bg-gray-50 border rounded-xl"
              placeholder="Subject Name"
              value={newSubject.name}
              onChange={(e) =>
                setNewSubject({ ...newSubject, name: e.target.value })
              }
            />
            <input
              className="w-full mb-4 p-3 bg-gray-50 border rounded-xl"
              placeholder="Code (e.g. 5050)"
              value={newSubject.code}
              onChange={(e) =>
                setNewSubject({ ...newSubject, code: e.target.value })
              }
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="px-4 py-2 text-gray-500 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveNewSubject}
                className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
