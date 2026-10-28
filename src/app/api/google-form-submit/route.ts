import { NextRequest, NextResponse } from "next/server";

const FORM_ID = "1FAIpQLSfjE092Bc4OzAAW0ZKVPAmN1a7jfLQvwAma0ThsjHrJJgtIvw";
const ENTRY_IDS = [1756156797,1465149084,555303497,805335808,1017018161,486992937,1093758937,2138180741,1153971451,1445444539,1887031331,1295594199,2035700889,1000563724,1357938600,351152912,792188929,540438042,1260791854,2048086794,21800466,651664970,2044592347,1654610009,56104038,2064600507,1209077382,1431412221,980257845,117306198,877811103,139571319,537588184,988013749,908959821,594031994,820878077,1006581355,1572303241,1669599007,1290752551,1377478398];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const answers = body?.answers;
    if (!Array.isArray(answers) || answers.length !== ENTRY_IDS.length) {
      return NextResponse.json({ ok: false, error: `Expected exactly ${ENTRY_IDS.length} answers in questionnaire order.` }, { status: 400 });
    }
    const data = new URLSearchParams();
    ENTRY_IDS.forEach((id, index) => {
      const value = answers[index];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        data.append(`entry.${id}`, String(value));
      }
    });
    data.set("fvv", "1");
    data.set("pageHistory", "0");
    data.set("fbzx", "");
    const response = await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; ResearchResponseImporter/1.0)",
      },
      body: data.toString(),
      redirect: "follow",
      cache: "no-store",
    });
    const html = await response.text();
    const success = response.ok && (
      html.includes("Your response has been recorded") ||
      html.includes("Your response has been submitted") ||
      response.url.includes("formResponse")
    );
    return NextResponse.json({
      ok: success,
      status: response.status,
      message: success ? "Google Forms accepted the submission response." : "Google Forms did not return a verifiable confirmation. Check the form and do not retry blindly.",
    }, { status: success ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Submission failed." }, { status: 500 });
  }
}
