import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL, PRIVACY_VERSION } from "@/lib/legal";

const PAGE = `${LEGAL.site}/privacidad`;

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de tratamiento de datos — Lee con Koa" },
      { name: "description", content: "Qué datos guarda Lee con Koa, para qué los usa, con quién los comparte y cómo puedes consultarlos, corregirlos o borrarlos." },
      { property: "og:title", content: "Política de tratamiento de datos — Lee con Koa" },
      { property: "og:description", content: "Tus datos de lectura, cómo se protegen y cómo ejercer tus derechos." },
      { property: "og:url", content: PAGE },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: PAGE }],
  }),
  component: Privacy,
});

function Contact() {
  return LEGAL.email
    ? <>escribe a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> o usa el formulario de <Link to="/faq">Preguntas y contacto</Link></>
    : <>usa el formulario de <Link to="/faq">Preguntas y contacto</Link> o, dentro de la app, Ajustes → Sugerencias y ayuda</>;
}

function Privacy() {
  return (
    <div className="koa-app">
      <header className="koa-header">
        <Link className="koa-brand" to="/"><img src="/koa/icon.webp" width={40} height={40} alt="" />Lee con Koa</Link>
        <Link className="koa-secondary" to="/auth">Entrar</Link>
      </header>
      <main className="koa-container max-w-3xl koa-legal space-y-6 pb-16">
        <p className="koa-eyebrow">Versión {PRIVACY_VERSION}</p>
        <h1>Política de tratamiento de datos personales</h1>
        <p>
          Esta política explica cómo {LEGAL.product} trata tus datos personales, conforme a la Ley 1581 de 2012,
          el Decreto 1377 de 2013 y demás normas de protección de datos de {LEGAL.country}.
        </p>

        <section><h2>1. Responsable</h2>
          <p>{LEGAL.owner}{LEGAL.taxId && ` · ${LEGAL.taxId}`}, responsable de {LEGAL.product} ({LEGAL.site}). Para cualquier asunto de datos, <Contact />.</p>
        </section>

        <section><h2>2. Qué datos guardamos</h2>
          <ul>
            <li><strong>Cuenta:</strong> correo, nombre visible y, si entras con Google, el nombre que Google comparte.</li>
            <li><strong>Lectura:</strong> tu biblioteca, estados, fechas, páginas, sesiones, estrellas, reseñas y sensaciones.</li>
            <li><strong>Contenido que creas:</strong> notas, citas, fotos y audios del cuaderno, listas, bingos, calendarios y conversaciones con Koa.</li>
            <li><strong>Perfil social (opcional):</strong> lo que decidas mostrar en Mi refugio, amistades y clubes.</li>
            <li><strong>Plan Pro:</strong> el estado de tu suscripción. Los datos de pago los maneja Whop; nosotros no vemos tu tarjeta.</li>
            <li><strong>Uso técnico:</strong> registros necesarios para que la app funcione y sea segura.</li>
          </ul>
        </section>

        <section><h2>3. Para qué los usamos</h2>
          <ul>
            <li>Darte el servicio: guardar tu biblioteca, tu progreso y tus rachas.</li>
            <li>Recomendarte libros con el Oráculo y conversar con Koa sobre tus lecturas.</li>
            <li>Responder tus mensajes de ayuda y avisarte de cambios importantes en tu cuenta o en esta política.</li>
            <li>Solo si lo autorizas: enviarte novedades, retos, recomendaciones y promociones de {LEGAL.product}. Puedes retirar este permiso en Ajustes cuando quieras.</li>
          </ul>
          <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        </section>

        <section><h2>4. Con quién se comparten</h2>
          <p>Solo con proveedores que nos ayudan a prestar el servicio, como encargados del tratamiento:</p>
          <ul>
            <li><strong>Lovable Cloud (Supabase):</strong> alojamiento de la base de datos, archivos e inicio de sesión.</li>
            <li><strong>Proveedor de inteligencia artificial</strong> (modelos de Google a través de Lovable AI): recibe lo necesario para cada recomendación, lectura de portada o conversación.</li>
            <li><strong>Open Library y Google Books:</strong> reciben solo el ISBN o el título que buscas.</li>
            <li><strong>Whop:</strong> procesa el pago del plan Pro.</li>
          </ul>
          <p>Estos servicios pueden estar fuera de {LEGAL.country}. Al aceptar esta política autorizas esa transferencia, que se hace con proveedores que ofrecen garantías de seguridad.</p>
        </section>

        <section><h2>5. Tus derechos</h2>
          <p>Puedes conocer, actualizar y corregir tus datos; pedir prueba de tu autorización; saber cómo se han usado; revocar la autorización o pedir que se borren; y presentar quejas ante la Superintendencia de Industria y Comercio.</p>
          <ul>
            <li><strong>Borrar todo:</strong> Ajustes → Tu cuenta → Eliminar mi cuenta. Se borran tu biblioteca, notas, fotos y perfil.</li>
            <li><strong>Dejar de recibir correos:</strong> Ajustes → Tu cuenta.</li>
            <li><strong>Consultas y reclamos:</strong> <Contact />. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15.</li>
          </ul>
        </section>

        <section id="borrar-cuenta"><h2>6. Cómo eliminar tu cuenta y tus datos</h2>
          <p>Puedes eliminar tu cuenta de {LEGAL.product} de dos formas:</p>
          <ul>
            <li><strong>Desde la app o la web:</strong> entra a Ajustes → Tu cuenta → Eliminar mi cuenta y confirma. El borrado es inmediato.</li>
            <li><strong>Sin la app instalada:</strong> {LEGAL.email
              ? <>escribe a <a href={`mailto:${LEGAL.email}?subject=Eliminar%20mi%20cuenta%20de%20Lee%20con%20Koa`}>{LEGAL.email}</a> desde el correo de tu cuenta, con el asunto «Eliminar mi cuenta»</>
              : <>usa el formulario de <Link to="/faq">Preguntas y contacto</Link> con el correo de tu cuenta</>}. La borramos en máximo 15 días hábiles y te confirmamos por correo.</li>
          </ul>
          <p>Se borran tu cuenta, biblioteca, progreso, reseñas, notas, fotos, audios, listas, conversaciones con Koa y perfil social. No guardamos copias. Si tenías plan Pro, Whop conserva el registro del pago según sus propias obligaciones legales; cancélalo también en Whop para que no se renueve.</p>
        </section>

        <section><h2>7. Seguridad y conservación</h2>
          <p>Tu biblioteca y tu cuaderno son privados por defecto: cada consulta se valida con tu sesión y solo se comparte lo que tú eliges. Guardamos tus datos mientras tengas la cuenta; al eliminarla se borran, salvo lo que la ley obligue a conservar.</p>
        </section>

        <section><h2>8. Menores de edad</h2>
          <p>Si eres menor de edad, usa {LEGAL.product} con autorización de tu madre, padre o representante legal. Respetamos tu interés superior y tus derechos.</p>
        </section>

        <section><h2>9. Cambios</h2>
          <p>Si cambiamos esta política te lo avisaremos en la app y te pediremos aceptarla de nuevo cuando el cambio sea importante. Vigente desde el {PRIVACY_VERSION}.</p>
        </section>
      </main>
    </div>
  );
}
