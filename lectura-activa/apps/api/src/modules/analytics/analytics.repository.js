import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

const COLLECTION = 'analyticsDaily';

function col() {
  return getDb().collection(COLLECTION);
}

export const analyticsRepository = {
  async upsertDaily({ date, groupId, assignmentId, metrics }) {
    const now = new Date();
    const result = await col().findOneAndUpdate(
      {
        date,
        groupId: new ObjectId(groupId),
        assignmentId: new ObjectId(assignmentId)
      },
      {
        $set: {
          ...metrics,
          date,
          groupId: new ObjectId(groupId),
          assignmentId: new ObjectId(assignmentId),
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result.value ?? result;
  },

  async findByGroup(groupId, { from, to }) {
    const filter = { groupId: new ObjectId(groupId) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    return col().find(filter).sort({ date: -1 }).toArray();
  },

  async findByAssignment(assignmentId, { from, to }) {
    const filter = { assignmentId: new ObjectId(assignmentId) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    return col().find(filter).sort({ date: -1 }).toArray();
  },

  /**
   * ✅ NUEVO: resumen agregado de todos los grupos del docente.
   * Consulta `studentAssignments` filtrando por los grupos del docente.
   */
  async summaryByTeacher(teacherId) {
    const db = getDb();
    
    // 1. Obtener los grupos del docente
    const grupos = await db
      .collection('groups')
      .find({ teacherId: new ObjectId(teacherId), deletedAt: null })
      .project({ _id: 1, name: 1 })
      .toArray();
    
    if (grupos.length === 0) {
      return [];
    }
    
    const groupIds = grupos.map((g) => g._id);
    const groupById = new Map(grupos.map((g) => [g._id.toString(), g.name]));
    
    // 2. Buscar los studentAssignments de esos grupos
    const studentAssignments = await db
      .collection('studentAssignments')
      .find({})
      .toArray();
    
    if (studentAssignments.length === 0) {
      return [];
    }
    
    // 3. Buscar los assignments correspondientes a esos grupos
    const assignmentIds = [...new Set(studentAssignments.map((sa) => sa.assignmentId.toString()))];
    const assignments = await db
      .collection('assignments')
      .find({ _id: { $in: assignmentIds.map((id) => new ObjectId(id)) } })
      .toArray();
    
    const assignmentsByGroup = new Map();
    assignments.forEach((a) => {
      const gId = a.groupId.toString();
      if (!assignmentsByGroup.has(gId)) assignmentsByGroup.set(gId, []);
      assignmentsByGroup.get(gId).push(a);
    });
    
    // 4. Filtrar solo los studentAssignments que pertenecen a grupos del docente
    const relevantSAs = studentAssignments.filter((sa) => {
      const assignment = assignments.find(
        (a) => a._id.toString() === sa.assignmentId.toString()
      );
      return assignment && groupIds.some((gId) => gId.toString() === assignment.groupId.toString());
    });
    
    if (relevantSAs.length === 0) {
      return [];
    }
    
    // 5. Agrupar por estudiante
    const byStudent = new Map();
    relevantSAs.forEach((sa) => {
      const studentId = sa.studentId.toString();
      if (!byStudent.has(studentId)) {
        byStudent.set(studentId, {
          studentId,
          score: 0,
          timeSpentSeconds: 0,
          completed: 0,
          pending: 0,
          groupNames: new Set(),
        });
      }
      const entry = byStudent.get(studentId);
      entry.score += sa.score ?? 0;
      entry.timeSpentSeconds += sa.timeSpentSeconds ?? 0;
      if (sa.status === 'completed') entry.completed += 1;
      else if (sa.status === 'pending' || sa.status === 'in_progress') entry.pending += 1;
      
      // Encontrar el grupo
      const assignment = assignments.find(
        (a) => a._id.toString() === sa.assignmentId.toString()
      );
      if (assignment) {
        const gName = groupById.get(assignment.groupId.toString());
        if (gName) entry.groupNames.add(gName);
      }
    });
    
    // 6. Enriquecer con datos del usuario
    const studentIds = [...byStudent.keys()];
    const users = await db
      .collection('users')
      .find({ _id: { $in: studentIds.map((id) => new ObjectId(id)) } })
      .project({ _id: 1, fullName: 1, email: 1 })
      .toArray();
    
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    
    // 7. Devolver items
    return [...byStudent.values()].map((entry) => {
      const user = userById.get(entry.studentId);
      return {
        studentId: entry.studentId,
        fullName: user?.fullName ?? null,
        email: user?.email ?? null,
        groupName: [...entry.groupNames].join(', '),
        score: entry.score,
        timeSpentSeconds: entry.timeSpentSeconds,
        completed: entry.completed,
        pending: entry.pending,
      };
    });
  },
};